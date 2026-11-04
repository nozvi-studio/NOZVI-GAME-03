import type { SkillDef } from '../skills';
import { cutTail } from '../snake';

// MEC-006-R20..R22 cut tail-first and protect the head's next queued/current cell.
export const tailSnipSkill: SkillDef = {
  id: 'tailSnip',
  active: s => s.snipWalls.some(w => w.state === 'solid'),
  precondition: (s, b) => s.snake.length > b.skills.tailSnip.minLength,
  apply(s, b, ctx) {
    const minLength = b.skills.tailSnip.minLength;
    const removed = cutTail(s, Math.max(minLength, Math.ceil(s.snake.length / 2)), minLength);
    const head = s.snake[0]!, dir = s.queue[0] ?? s.dir;
    const cells = removed.filter(c => c.x !== head.x + dir.x || c.y !== head.y + dir.y);
    s.tailFrom = { ...s.snake[s.snake.length - 1]! };
    if (cells.length) s.snipWalls.push({ family: 'snipWall', cells: cells.map(c => ({ ...c })), state: 'solid', leftMs: b.skills.tailSnip.wallLifeMs });
    ctx.emit({ type: 'tailSnipped', cut: removed.length, cells });
  },
  leftMs: s => Math.max(0, ...s.snipWalls.filter(w => w.state === 'solid').map(w => w.leftMs)),
};
