(function (global) {
  const scenarios = [
    {
      id: "greeting-resident",
      title: "Greeting a New Resident",
      context: "Amara meets Mr. Chen for the first time and helps him feel safe.",
      dialogue: [
        { speaker: "Amara", text: "Good morning. My name is Amara. I am your personal support worker." },
        { speaker: "Resident", text: "Good morning Amara. My name is Mr. Chen. This place feels new." },
        { speaker: "Amara", text: "Thank you, Mr. Chen. I am happy to meet you. I will help you today." },
        { speaker: "Resident", text: "Thank you. I feel a little nervous." },
        { speaker: "Amara", text: "That is okay. I am here with you. You can ask me any question." },
        { speaker: "Resident", text: "Thank you Amara. I feel better now." }
      ],
      culturalNarration: [
        "In Canada, staff introduce themselves clearly to new residents.",
        "This helps residents feel safe and respected on the first day.",
        "Using names and a calm voice helps build trust."
      ],
      keyPhrase: "I am here with you. You can ask me any question.",
      reflectionQuestion: "How do you greet a new resident?"
    },
    {
      id: "resident-refuses-help",
      title: "Resident Refuses Help",
      context: "Amara stays calm when Mr. Chen does not want help before lunch.",
      dialogue: [
        { speaker: "Amara", text: "Hello Mr. Chen. I am here to help you wash your hands before lunch." },
        { speaker: "Resident", text: "No, I do not want help. Please go." },
        { speaker: "Amara", text: "I hear you. I will not touch you now. Can you tell me why you do not want help?" },
        { speaker: "Resident", text: "I feel tired. I want to sleep." },
        { speaker: "Amara", text: "I understand. I will return in 10 minutes. If you need me, you can press this button." },
        { speaker: "Resident", text: "Okay Amara. Thank you for your patience." }
      ],
      culturalNarration: [
        "In Canadian care homes, residents have the right to say no.",
        "Staff stay calm, speak softly, and do not force care.",
        "They respect the choice and try again in a kind way."
      ],
      keyPhrase: "I understand. I will return in 10 minutes.",
      reflectionQuestion: "How can you stay calm when a resident refuses?"
    },
    {
      id: "talking-to-supervisor",
      title: "Talking to Your Supervisor",
      context: "Amara tells her supervisor about a care problem and asks for help.",
      dialogue: [
        { speaker: "Amara", text: "Hello Nurse Lee. Do you have one minute?" },
        { speaker: "Supervisor", text: "Hello Amara. Yes, I have time. What is wrong?" },
        { speaker: "Amara", text: "Mr. Chen refused his morning bath. I spoke softly and I stayed calm, but he still said no." },
        { speaker: "Supervisor", text: "Thank you for telling me. You did well. Let us plan another time for the bath." },
        { speaker: "Amara", text: "Can you please join me later to speak with him?" },
        { speaker: "Supervisor", text: "Yes, Amara. We will go together and talk with him." }
      ],
      culturalNarration: [
        "In Canadian care homes, staff tell the supervisor when there is a problem.",
        "This is seen as professional and safe, not as failure.",
        "Asking for help protects the resident and also supports the worker."
      ],
      keyPhrase: "I understand. I will return in 10 minutes.",
      reflectionQuestion: "How can you ask your supervisor for help?"
    },
    {
      id: "small-emergency",
      title: "Handling a Small Emergency",
      context: "Amara keeps Mr. Chen calm, seated, and safe while she calls the nurse.",
      dialogue: [
        { speaker: "Amara", text: "Mr. Chen, are you okay? You look very pale." },
        { speaker: "Resident", text: "I feel very dizzy. I cannot stand." },
        { speaker: "Amara", text: "I understand. Please sit in the chair. I will call the nurse now." },
        { speaker: "Resident", text: "Please stay with me." },
        { speaker: "Amara", text: "I am here with you. I am pressing the red button on the wall to call the nurse." },
        { speaker: "Resident", text: "Thank you Amara. I feel safe with you." }
      ],
      culturalNarration: [
        "In a small emergency, staff stay calm and speak clearly.",
        "They use the call bell or button to bring a nurse fast.",
        "They stay with the resident and give simple, clear information."
      ],
      keyPhrase: "I will call the nurse now.",
      reflectionQuestion: "How can you stay calm in a small emergency?"
    }
  ];

  function findScenarioById(id) {
    return scenarios.find(function (scenario) {
      return scenario.id === id;
    }) || null;
  }

  function buildReflectionPromptContext(scenario) {
    if (!scenario) {
      return "";
    }

    const dialogueLines = scenario.dialogue.map(function (turn) {
      return turn.speaker + ": " + turn.text;
    });

    return [
      "Scenario: " + scenario.title,
      "Context: " + scenario.context,
      "Dialogue:",
      dialogueLines.join("\n"),
      "Cultural narration:",
      scenario.culturalNarration.join(" "),
      "Key phrase: " + scenario.keyPhrase,
      "Fallback reflection question: " + scenario.reflectionQuestion
    ].join("\n");
  }

  global.CareVoiceScenarios = {
    scenarios: scenarios,
    findScenarioById: findScenarioById,
    buildReflectionPromptContext: buildReflectionPromptContext
  };
})(globalThis);
