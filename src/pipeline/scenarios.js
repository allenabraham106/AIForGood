(function (global) {
  const scenarios = [
    {
      id: "greeting-resident",
      title: "Greeting a New Resident",
      context: "A PSW meets a resident for the first time at the start of a shift.",
      dialogue: [
        { speaker: "PSW", text: "Good morning. My name is Amara. I am here to help you today." },
        { speaker: "Resident", text: "Oh, hello. I do not know you." },
        { speaker: "PSW", text: "I understand. I will be gentle. Can I bring you some water first?" },
        { speaker: "Resident", text: "Yes, please. Thank you." }
      ],
      culturalNarration: [
        "Notice how Amara says her name right away.",
        "In Canadian care homes, residents often feel calmer when they know who is helping them.",
        "Offering something small, like water, shows respect and care."
      ],
      keyPhrase: "I will be gentle. I am here to help.",
      reflectionQuestion: "What could you say to help them feel safe?"
    },
    {
      id: "resident-refuses-help",
      title: "Responding With Patience",
      context: "A resident refuses help, and the PSW needs to stay calm and respectful.",
      dialogue: [
        { speaker: "PSW", text: "Ms. Lee, it is time to get ready now." },
        { speaker: "Resident", text: "No. I do not want help." },
        { speaker: "PSW", text: "That is okay. We can go slowly." },
        { speaker: "Resident", text: "I am tired today." },
        { speaker: "PSW", text: "I understand. Would you like to sit first?" },
        { speaker: "Resident", text: "Yes. That would help." }
      ],
      culturalNarration: [
        "The PSW does not argue or rush the resident.",
        "In Canadian care settings, patience and choice help build trust.",
        "A calm voice can lower stress for both people."
      ],
      keyPhrase: "That is okay. We can go slowly.",
      reflectionQuestion: "What can you say when they say no?"
    },
    {
      id: "talking-to-supervisor",
      title: "Talking to Your Supervisor",
      context: "A PSW needs to explain a shift problem clearly and professionally.",
      dialogue: [
        { speaker: "PSW", text: "Hi, Maria. I need help with room twelve." },
        { speaker: "Supervisor", text: "What is happening?" },
        { speaker: "PSW", text: "Mr. Chen needs two people to move safely." },
        { speaker: "Supervisor", text: "Thank you for telling me." },
        { speaker: "PSW", text: "Can someone come with me now?" },
        { speaker: "Supervisor", text: "Yes. I will send Jordan." }
      ],
      culturalNarration: [
        "The PSW gives the problem clearly and asks for help early.",
        "In many Canadian workplaces, asking for support is safer than struggling alone.",
        "Short, direct updates help supervisors act quickly."
      ],
      keyPhrase: "I need help with room twelve.",
      reflectionQuestion: "How do you ask your supervisor for help?"
    },
    {
      id: "small-emergency",
      title: "Handling a Small Emergency",
      context: "A resident feels weak, and the PSW needs to stay calm and call for help.",
      dialogue: [
        { speaker: "Resident", text: "I feel dizzy." },
        { speaker: "PSW", text: "Please stay seated. I am here with you." },
        { speaker: "Resident", text: "Okay." },
        { speaker: "PSW", text: "I am calling the nurse now." },
        { speaker: "Nurse", text: "We are on the way." },
        { speaker: "PSW", text: "You are safe. Help is coming." }
      ],
      culturalNarration: [
        "The PSW uses calm, simple words.",
        "In an emergency, clear reassurance helps the resident feel safer.",
        "Calling for help quickly is part of good care, not a mistake."
      ],
      keyPhrase: "Please stay seated. Help is coming.",
      reflectionQuestion: "What do you say to keep them calm and safe?"
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
      "Key phrase: " + scenario.keyPhrase
    ].join("\n");
  }

  global.CareVoiceScenarios = {
    scenarios: scenarios,
    findScenarioById: findScenarioById,
    buildReflectionPromptContext: buildReflectionPromptContext
  };
})(globalThis);
