// Scenario-based lessons for Rohingya women in Waterloo
// Target: ~5% English literacy — very short prompts, simple words, audio-first

export const SCENARIOS = {
  basics: {
    id: 'basics',
    icon: 'sprout',
    label: '0/4',
    color: 'blue',
    lessons: [
      { id: 'b1', prompt: 'Say it back:', phrase: 'Good morning. How are you?', scenario: 'greeting' },
      { id: 'b2', prompt: 'Say it back:', phrase: 'My name is ___. I am new.', scenario: 'introduction' },
      { id: 'b3', prompt: 'Say it back:', phrase: 'Yes, I need help, please.', scenario: 'help' },
      { id: 'b4', prompt: 'Say it back:', phrase: 'Thank you.', scenario: 'gratitude' },
    ],
  },
  speaking: {
    id: 'speaking',
    icon: 'speak',
    label: '0/4',
    color: 'orange',
    lessons: [
      { id: 's1', prompt: 'Say it back:', phrase: "I'm late. I come soon.", scenario: 'workplace' },
      { id: 's2', prompt: 'Say it back:', phrase: 'Where is the break room?', scenario: 'workplace' },
      { id: 's3', prompt: 'Say it back:', phrase: 'Repeat, please?', scenario: 'workplace' },
      { id: 's4', prompt: 'Say it back:', phrase: 'I am sick. I need tomorrow off.', scenario: 'workplace' },
    ],
  },
  community: {
    id: 'community',
    icon: 'people',
    label: '0/4',
    color: 'green',
    lessons: [
      { id: 'c1', prompt: 'Say it back:', phrase: 'I am looking for work.', scenario: 'employment' },
      { id: 'c2', prompt: 'Say it back:', phrase: 'What time do I start?', scenario: 'workplace' },
      { id: 'c3', prompt: 'Say it back:', phrase: 'I need help. Room twelve.', scenario: 'workplace' },
      { id: 'c4', prompt: 'Say it back:', phrase: 'Sorry. Repeat?', scenario: 'workplace' },
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

// Tree node positions — at branch endpoints (tips)
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
