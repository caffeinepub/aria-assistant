import Map "mo:core/Map";
import Text "mo:core/Text";
import Nat "mo:core/Nat";
import Principal "mo:core/Principal";
import Iter "mo:core/Iter";
import Runtime "mo:core/Runtime";
import Time "mo:core/Time";
import Array "mo:core/Array";
import MixinAuthorization "authorization/MixinAuthorization";
import AccessControl "authorization/access-control";

actor {
  // Include the authorization component
  let accessControlState = AccessControl.initState();
  include MixinAuthorization(accessControlState);

  type UserId = Principal;
  type Timestamp = Int;

  public type UserProfile = {
    username : Text;
    email : Text;
  };

  public type Message = {
    role : Text; // "user" or "assistant"
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

  let chatHistories = Map.empty<UserId, [Message]>();
  let userMemories = Map.empty<UserId, Map.Map<Text, Text>>();
  let userProfiles = Map.empty<UserId, UserProfile>();

  // User Profile Management

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

  // Memory management functions

  public shared ({ caller }) func updateMemoryEntry(key : Text, value : Text) : async () {
    if (not AccessControl.hasPermission(accessControlState, caller, #user)) {
      Runtime.trap("Unauthorized: Only users can update memory entries");
    };

    let existingMemory = switch (userMemories.get(caller)) {
      case (null) { Map.empty<Text, Text>() };
      case (?memory) { memory };
    };

    existingMemory.add(key, value);
    userMemories.add(caller, existingMemory);
  };

  public query ({ caller }) func getAllMemoryEntries() : async [MemoryEntry] {
    if (not AccessControl.hasPermission(accessControlState, caller, #user)) {
      Runtime.trap("Unauthorized: Only users can get memory entries");
    };

    switch (userMemories.get(caller)) {
      case (null) { [] };
      case (?memory) {
        memory.entries().toArray().map(func((k, v)) : MemoryEntry { { key = k; value = v } });
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

  // Chat history functions
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

  // Helper function to generate personalized response
  private func generateMelinaResponse(caller : UserId, userMessage : Text) : Text {
    // Get user's name from memory
    let userName = switch (userMemories.get(caller)) {
      case (null) { "there" };
      case (?memory) {
        switch (memory.get("name")) {
          case (null) { "there" };
          case (?name) { name };
        };
      };
    };

    // Get user's tone preference
    let tone = switch (userMemories.get(caller)) {
      case (null) { "friendly" };
      case (?memory) {
        switch (memory.get("tone")) {
          case (null) { "friendly" };
          case (?t) { t };
        };
      };
    };

    // Get recent chat context
    let recentMessages = switch (chatHistories.get(caller)) {
      case (null) { [] };
      case (?history) {
        if (history.size() > 5) {
          history.sliceToArray(0, 5);
        } else {
          history;
        };
      };
    };

    // Generate contextual response (simplified AI simulation)
    let greeting = if (recentMessages.size() == 0) {
      "Hello " # userName # "! I'm Melina, your AI assistant. ";
    } else { "" };

    let response = greeting # "I understand you said: \"" # userMessage # "\". ";

    // Add personalized touch based on tone
    let personalizedResponse = if (tone == "formal") {
      response # "I'm here to assist you professionally with any questions or tasks you may have.";
    } else if (tone == "casual") {
      response # "I'm here to help out however I can! What's on your mind?";
    } else {
      response # "I'm here to help you with whatever you need. How can I assist you today?";
    };

    personalizedResponse;
  };

  // Main chat endpoint
  public shared ({ caller }) func chat(request : ChatRequest) : async ChatResponse {
    if (not AccessControl.hasPermission(accessControlState, caller, #user)) {
      Runtime.trap("Unauthorized: Only users can chat");
    };

    let userMessage = request.message;
    let timestamp = Time.now();

    // Store user message
    let newUserMessage : Message = {
      role = "user";
      content = userMessage;
      timestamp;
    };

    let history = switch (chatHistories.get(caller)) {
      case (null) { [] };
      case (?h) { h };
    };

    let historyWithUser = [newUserMessage].concat(history);

    // Generate Melina's response
    let responseContent = generateMelinaResponse(caller, userMessage);

    // Store assistant response
    let assistantMessage : Message = {
      role = "assistant";
      content = responseContent;
      timestamp = Time.now();
    };

    let updatedHistory = [assistantMessage].concat(historyWithUser);

    // Keep only the last 50 messages
    let trimmedHistory = if (updatedHistory.size() > 50) {
      updatedHistory.sliceToArray(0, 50);
    } else {
      updatedHistory;
    };

    chatHistories.add(caller, trimmedHistory);

    // Return response
    {
      message = userMessage;
      response = responseContent;
    };
  };
};
