import Iter "mo:core/Iter";
import Map "mo:core/Map";
import Text "mo:core/Text";
import Array "mo:core/Array";
import List "mo:core/List";
import Nat "mo:core/Nat";
import Time "mo:core/Time";
import Principal "mo:core/Principal";
import Runtime "mo:core/Runtime";
import AccessControl "authorization/access-control";
import MixinAuthorization "authorization/MixinAuthorization";

actor {
  public type UserId = Principal;
  type Timestamp = Int;

  public type UserProfile = {
    username : Text;
    email : Text;
  };

  public type Message = {
    role : Text;
    content : Text;
    timestamp : Timestamp;
  };

  public type MemoryEntry = {
    key : Text;
    value : Text;
  };

  public type ChatRequest = {
    message : Text;
  };

  public type ChatResponse = {
    message : Text;
    response : Text;
  };

  public type Reminder = {
    id : Nat;
    title : Text;
    note : Text;
    dueTime : Timestamp;
    completed : Bool;
  };

  public type NotificationSource = {
    #calendar;
    #email;
    #message;
  };

  public type Notification = {
    id : Nat;
    source : NotificationSource;
    content : Text;
    suggestion : Text;
    dismissed : Bool;
  };

  public type IntegrationStatus = {
    calendar : Bool;
    messages : Bool;
    email : Bool;
    files : Bool;
    camera : Bool;
    contacts : Bool;
  };

  public type ChatTone = {
    #formal;
    #friendly;
    #casual;
    #humorous;
  };

  public type AssistantSettings = {
    tone : ChatTone;
    notificationsEnabled : Bool;
    memoryTrackingEnabled : Bool;
    assistantDisplayName : Text;
  };

  public type ActivityStats = {
    totalMessages : Nat;
    pendingReminders : Nat;
    completedReminders : Nat;
    memoryEntries : Nat;
    unreadNotifications : Nat;
  };

  let accessControlState = AccessControl.initState();
  include MixinAuthorization(accessControlState);

  let chatHistories = Map.empty<UserId, [Message]>();
  let userMemories = Map.empty<UserId, Map.Map<Text, Text>>();
  let userProfiles = Map.empty<UserId, UserProfile>();
  let reminders = Map.empty<UserId, Map.Map<Nat, Reminder>>();
  let notifications = Map.empty<UserId, Map.Map<Nat, Notification>>();
  let integrationStatuses = Map.empty<UserId, IntegrationStatus>();
  let assistantSettings = Map.empty<UserId, AssistantSettings>();

  var nextReminderId = 1;
  var nextNotificationId = 1;

  private func getOrCreateMap<K, V>(store : Map.Map<UserId, Map.Map<K, V>>, userId : UserId) : Map.Map<K, V> {
    switch (store.get(userId)) {
      case (null) {
        let newMap = Map.empty<K, V>();
        store.add(userId, newMap);
        newMap;
      };
      case (?existing) { existing };
    };
  };

  public query ({ caller }) func getCallerUserProfile() : async ?UserProfile {
    if (not AccessControl.hasPermission(accessControlState, caller, #user)) {
      Runtime.trap("Unauthorized: Only users can view profiles");
    };
    userProfiles.get(caller);
  };

  public query ({ caller }) func getUserProfile(user : Principal) : async ?UserProfile {
    if (caller != user and not AccessControl.isAdmin(accessControlState, caller)) {
      Runtime.trap("Unauthorized: Can only view your own profile");
    };
    userProfiles.get(user);
  };

  public shared ({ caller }) func saveCallerUserProfile(profile : UserProfile) : async () {
    if (not AccessControl.hasPermission(accessControlState, caller, #user)) {
      Runtime.trap("Unauthorized: Only users can save profiles");
    };
    userProfiles.add(caller, profile);
  };

  public shared ({ caller }) func updateMemoryEntry(key : Text, value : Text) : async () {
    if (not AccessControl.hasPermission(accessControlState, caller, #user)) {
      Runtime.trap("Unauthorized: Only users can update memory entries");
    };
    let memory = getOrCreateMap(userMemories, caller);
    memory.add(key, value);
    userMemories.add(caller, memory);
  };

  public query ({ caller }) func getAllMemoryEntries() : async [MemoryEntry] {
    if (not AccessControl.hasPermission(accessControlState, caller, #user)) {
      Runtime.trap("Unauthorized: Only users can get memory entries");
    };
    switch (userMemories.get(caller)) {
      case (null) { [] };
      case (?memory) {
        memory.entries().toArray().map(func((k, v)) { { key = k; value = v } });
      };
    };
  };

  public shared ({ caller }) func deleteMemoryEntry(key : Text) : async () {
    if (not AccessControl.hasPermission(accessControlState, caller, #user)) {
      Runtime.trap("Unauthorized: Only users can delete memory entries");
    };
    switch (userMemories.get(caller)) {
      case (null) { () };
      case (?memory) {
        memory.remove(key);
        userMemories.add(caller, memory);
      };
    };
  };

  public query ({ caller }) func getChatHistory() : async [Message] {
    if (not AccessControl.hasPermission(accessControlState, caller, #user)) {
      Runtime.trap("Unauthorized: Only users can get chat history");
    };
    switch (chatHistories.get(caller)) {
      case (null) { [] };
      case (?history) { history };
    };
  };

  public shared ({ caller }) func clearChatHistory() : async () {
    if (not AccessControl.hasPermission(accessControlState, caller, #user)) {
      Runtime.trap("Unauthorized: Only users can clear chat history");
    };
    chatHistories.remove(caller);
  };

  public shared ({ caller }) func createReminder(title : Text, note : Text, dueTime : Timestamp) : async Nat {
    if (not AccessControl.hasPermission(accessControlState, caller, #user)) {
      Runtime.trap("Unauthorized: Only users can create reminders");
    };

    let newReminder : Reminder = {
      id = nextReminderId;
      title;
      note;
      dueTime;
      completed = false;
    };

    let userReminders = getOrCreateMap(reminders, caller);
    userReminders.add(newReminder.id, newReminder);
    reminders.add(caller, userReminders);

    nextReminderId += 1;
    newReminder.id;
  };

  public query ({ caller }) func getReminders() : async [Reminder] {
    if (not AccessControl.hasPermission(accessControlState, caller, #user)) {
      Runtime.trap("Unauthorized: Only users can get reminders");
    };

    switch (reminders.get(caller)) {
      case (null) { [] };
      case (?userReminders) { userReminders.values().toArray() };
    };
  };

  public shared ({ caller }) func completeReminder(id : Nat) : async () {
    if (not AccessControl.hasPermission(accessControlState, caller, #user)) {
      Runtime.trap("Unauthorized: Only users can complete reminders");
    };

    switch (reminders.get(caller)) {
      case (null) { () };
      case (?userReminders) {
        switch (userReminders.get(id)) {
          case (null) { () };
          case (?reminder) {
            let updatedReminder = { reminder with completed = true };
            userReminders.add(id, updatedReminder);
          };
        };
      };
    };
  };

  public shared ({ caller }) func deleteReminder(id : Nat) : async () {
    if (not AccessControl.hasPermission(accessControlState, caller, #user)) {
      Runtime.trap("Unauthorized: Only users can delete reminders");
    };

    switch (reminders.get(caller)) {
      case (null) { () };
      case (?userReminders) {
        userReminders.remove(id);
      };
    };
  };

  public shared ({ caller }) func seedMockNotifications() : async () {
    if (not AccessControl.hasPermission(accessControlState, caller, #user)) {
      Runtime.trap("Unauthorized: Only users can seed notifications");
    };

    let mockNotifications : [Notification] = [
      {
        id = nextNotificationId;
        source = #calendar;
        content = "Meeting with Alice at 2pm";
        suggestion = "Would you like to set a reminder?";
        dismissed = false;
      },
      {
        id = nextNotificationId + 1;
        source = #email;
        content = "New email from Bob";
        suggestion = "Do you want to read it now?";
        dismissed = false;
      },
      {
        id = nextNotificationId + 2;
        source = #message;
        content = "Message from Carol: 'Let's grab lunch'";
        suggestion = "Should I suggest a location?";
        dismissed = false;
      },
    ];

    let userNotifications = getOrCreateMap(notifications, caller);

    func addNotification(notification : Notification) {
      userNotifications.add(notification.id, notification);
    };

    mockNotifications.values().forEach(addNotification);
    notifications.add(caller, userNotifications);

    nextNotificationId += 3;
  };

  public query ({ caller }) func getNotifications() : async [Notification] {
    if (not AccessControl.hasPermission(accessControlState, caller, #user)) {
      Runtime.trap("Unauthorized: Only users can get notifications");
    };

    switch (notifications.get(caller)) {
      case (null) { [] };
      case (?userNotifications) { userNotifications.values().toArray() };
    };
  };

  public shared ({ caller }) func dismissNotification(id : Nat) : async () {
    if (not AccessControl.hasPermission(accessControlState, caller, #user)) {
      Runtime.trap("Unauthorized: Only users can dismiss notifications");
    };

    switch (notifications.get(caller)) {
      case (null) { () };
      case (?userNotifications) {
        switch (userNotifications.get(id)) {
          case (null) { () };
          case (?notification) {
            let updatedNotification = { notification with dismissed = true };
            userNotifications.add(id, updatedNotification);
          };
        };
      };
    };
  };

  public shared ({ caller }) func setIntegrationStatus(integration : Text, enabled : Bool) : async () {
    if (not AccessControl.hasPermission(accessControlState, caller, #user)) {
      Runtime.trap("Unauthorized: Only users can set integration status");
    };

    let currentStatus = switch (integrationStatuses.get(caller)) {
      case (null) {
        {
          calendar = false;
          messages = false;
          email = false;
          files = false;
          camera = false;
          contacts = false;
        };
      };
      case (?existing) { existing };
    };

    let updatedStatus = if (integration == "Calendar") {
      { currentStatus with calendar = enabled };
    } else if (integration == "Messages") {
      { currentStatus with messages = enabled };
    } else if (integration == "Email") {
      { currentStatus with email = enabled };
    } else if (integration == "Files") {
      { currentStatus with files = enabled };
    } else if (integration == "Camera") {
      { currentStatus with camera = enabled };
    } else if (integration == "Contacts") {
      { currentStatus with contacts = enabled };
    } else {
      currentStatus;
    };

    integrationStatuses.add(caller, updatedStatus);
  };

  public query ({ caller }) func getIntegrationStatus() : async IntegrationStatus {
    if (not AccessControl.hasPermission(accessControlState, caller, #user)) {
      Runtime.trap("Unauthorized: Only users can get integration status");
    };

    switch (integrationStatuses.get(caller)) {
      case (null) {
        {
          calendar = false;
          messages = false;
          email = false;
          files = false;
          camera = false;
          contacts = false;
        };
      };
      case (?status) { status };
    };
  };

  public shared ({ caller }) func updateSettings(newSettings : AssistantSettings) : async () {
    if (not AccessControl.hasPermission(accessControlState, caller, #user)) {
      Runtime.trap("Unauthorized: Only users can update settings");
    };
    assistantSettings.add(caller, newSettings);
  };

  public query ({ caller }) func getSettings() : async AssistantSettings {
    if (not AccessControl.hasPermission(accessControlState, caller, #user)) {
      Runtime.trap("Unauthorized: Only users can get settings");
    };

    switch (assistantSettings.get(caller)) {
      case (null) {
        {
          tone = #friendly;
          notificationsEnabled = true;
          memoryTrackingEnabled = true;
          assistantDisplayName = "Melina";
        };
      };
      case (?settings) { settings };
    };
  };

  public query ({ caller }) func getActivityStats() : async ActivityStats {
    if (not AccessControl.hasPermission(accessControlState, caller, #user)) {
      Runtime.trap("Unauthorized: Only users can get activity stats");
    };

    let chatCount = switch (chatHistories.get(caller)) {
      case (null) { 0 };
      case (?history) { history.size() };
    };

    var pendingReminders = 0;
    var completedReminders = 0;
    switch (reminders.get(caller)) {
      case (null) {};
      case (?userReminders) {
        userReminders.values().forEach(func(r) {
          if (r.completed) { completedReminders += 1 } else {
            pendingReminders += 1;
          };
        });
      };
    };

    let memoryCount = switch (userMemories.get(caller)) {
      case (null) { 0 };
      case (?memory) { memory.size() };
    };

    var unreadCount = 0;
    switch (notifications.get(caller)) {
      case (null) {};
      case (?userNotifications) {
        userNotifications.values().forEach(func(n) {
          if (not n.dismissed) { unreadCount += 1 };
        });
      };
    };

    {
      totalMessages = chatCount;
      pendingReminders;
      completedReminders;
      memoryEntries = memoryCount;
      unreadNotifications = unreadCount;
    };
  };

  public shared ({ caller }) func chat(request : ChatRequest) : async ChatResponse {
    if (not AccessControl.hasPermission(accessControlState, caller, #user)) {
      Runtime.trap("Unauthorized: Only users can chat");
    };

    let userMessage = request.message;
    let timestamp = Time.now();

    let newUserMessage : Message = {
      role = "user";
      content = userMessage;
      timestamp;
    };

    let history = switch (chatHistories.get(caller)) {
      case (null) { List.empty<Message>().toArray() };
      case (?h) { h };
    };

    let historyWithUser = [newUserMessage].concat(history);

    let responseContent = userMessage;

    let assistantMessage : Message = {
      role = "assistant";
      content = responseContent;
      timestamp = Time.now();
    };

    let updatedHistory = [assistantMessage].concat(historyWithUser);

    let trimmedHistory = if (updatedHistory.size() > 50) {
      updatedHistory.sliceToArray(0, 50);
    } else {
      updatedHistory;
    };

    chatHistories.add(caller, trimmedHistory);

    {
      message = userMessage;
      response = responseContent;
    };
  };
};
