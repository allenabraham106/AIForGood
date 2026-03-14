// Scenario-based lessons for Rohingya newcomers in Waterloo
// Realistic, beginner-level scenarios: grocery, employment, healthcare, school, social

export const SCENARIOS = {
  basics: {
    id: 'basics',
    icon: 'sprout',
    label: '0/4',
    color: 'blue',
    lessons: [
      { id: 'b1', phrase: 'Hello, how are you?', scenario: 'greeting' },
      { id: 'b2', phrase: 'My name is ___.', scenario: 'introduction' },
      { id: 'b3', phrase: 'I need help, please.', scenario: 'help' },
      { id: 'b4', phrase: 'Thank you very much.', scenario: 'gratitude' },
    ],
  },
  speaking: {
    id: 'speaking',
    icon: 'speak',
    label: '0/4',
    color: 'orange',
    lessons: [
      { id: 's1', phrase: "I can't make it Saturday — I have a family commitment.", scenario: 'social' },
      { id: 's2', phrase: 'Where is the bus stop?', scenario: 'transport' },
      { id: 's3', phrase: 'How much does this cost?', scenario: 'shopping' },
      { id: 's4', phrase: 'I have an appointment at the doctor.', scenario: 'healthcare' },
    ],
  },
  community: {
    id: 'community',
    icon: 'people',
    label: '0/4',
    color: 'green',
    lessons: [
      { id: 'c1', phrase: 'I am looking for work.', scenario: 'employment' },
      { id: 'c2', phrase: 'My child goes to school here.', scenario: 'school' },
      { id: 'c3', phrase: 'Where is the grocery store?', scenario: 'shopping' },
      { id: 'c4', phrase: 'I need to speak with someone in my language.', scenario: 'support' },
    ],
  },
  progress: {
    id: 'progress',
    icon: 'chart',
    label: '0/4',
    color: 'grey',
    locked: true,
    lessons: [],
  },
};

// Section status: 'active' = green (ready to level up), 'locked' = purple
export const SECTION_STATUS = {
  basics: 'active',
  speaking: 'locked',
  community: 'locked',
};

// Tree node positions - each section is one branch, nodes share section color
export const TREE_NODES = [
  { id: 'b1', section: 'basics', x: 18, y: 72, type: 'speech' },
  { id: 'b2', section: 'basics', x: 10, y: 52, type: 'speech' },
  { id: 'b3', section: 'basics', x: 26, y: 52, type: 'speech' },
  { id: 'b4', section: 'basics', x: 18, y: 32, type: 'speech' },
  { id: 's1', section: 'speaking', x: 82, y: 72, type: 'speech' },
  { id: 's2', section: 'speaking', x: 90, y: 52, type: 'achievement' },
  { id: 's3', section: 'speaking', x: 74, y: 52, type: 'speech' },
  { id: 's4', section: 'speaking', x: 82, y: 32, type: 'speech' },
  { id: 'c1', section: 'community', x: 50, y: 55, type: 'speech' },
  { id: 'c2', section: 'community', x: 58, y: 35, type: 'speech' },
  { id: 'c3', section: 'community', x: 42, y: 35, type: 'speech' },
  { id: 'c4', section: 'community', x: 50, y: 18, type: 'speech' },
];
