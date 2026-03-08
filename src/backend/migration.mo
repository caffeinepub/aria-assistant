import Map "mo:core/Map";
import Principal "mo:core/Principal";
import Nat "mo:core/Nat";

module {
  public type Reminder = {
    id : Nat;
    title : Text;
    note : Text;
    dueTime : Int;
    completed : Bool;
  };

  public type ScheduleEvent = {
    id : Nat;
    title : Text;
    note : Text;
    category : Text;
    startTime : Int;
    endTime : Int;
    date : Text;
    completed : Bool;
  };

  public type Notification = {
    id : Nat;
    source : {
      #calendar;
      #email;
      #message;
    };
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

  public type UserProfile = {
    username : Text;
    email : Text;
  };

  public type AssistantSettings = {
    tone : {
      #formal;
      #friendly;
      #casual;
      #humorous;
    };
    notificationsEnabled : Bool;
    memoryTrackingEnabled : Bool;
    assistantDisplayName : Text;
  };

  public type Message = {
    role : Text;
    content : Text;
    timestamp : Int;
  };

  public type OldActor = {
    chatHistories : Map.Map<Principal, [Message]>;
    userMemories : Map.Map<Principal, Map.Map<Text, Text>>;
    userProfiles : Map.Map<Principal, UserProfile>;
    reminders : Map.Map<Principal, Map.Map<Nat, Reminder>>;
    notifications : Map.Map<Principal, Map.Map<Nat, Notification>>;
    integrationStatuses : Map.Map<Principal, IntegrationStatus>;
    assistantSettings : Map.Map<Principal, AssistantSettings>;
    nextReminderId : Nat;
    nextNotificationId : Nat;
  };

  public type NewActor = {
    chatHistories : Map.Map<Principal, [Message]>;
    userMemories : Map.Map<Principal, Map.Map<Text, Text>>;
    userProfiles : Map.Map<Principal, UserProfile>;
    reminders : Map.Map<Principal, Map.Map<Nat, Reminder>>;
    notifications : Map.Map<Principal, Map.Map<Nat, Notification>>;
    integrationStatuses : Map.Map<Principal, IntegrationStatus>;
    assistantSettings : Map.Map<Principal, AssistantSettings>;
    scheduleEvents : Map.Map<Principal, Map.Map<Nat, ScheduleEvent>>;
    nextReminderId : Nat;
    nextNotificationId : Nat;
    nextScheduleEventId : Nat;
  };

  public func run(old : OldActor) : NewActor {
    {
      chatHistories = old.chatHistories;
      userMemories = old.userMemories;
      userProfiles = old.userProfiles;
      reminders = old.reminders;
      notifications = old.notifications;
      integrationStatuses = old.integrationStatuses;
      assistantSettings = old.assistantSettings;
      scheduleEvents = Map.empty<Principal, Map.Map<Nat, ScheduleEvent>>();
      nextReminderId = old.nextReminderId;
      nextNotificationId = old.nextNotificationId;
      nextScheduleEventId = 1;
    };
  };
};
