// No ambiguous chars: I, O, 0, 1
const CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

const generateRoomCode = () =>
  Array.from({ length: 6 }, () => CHARS[Math.floor(Math.random() * CHARS.length)]).join('');

module.exports = { generateRoomCode };
