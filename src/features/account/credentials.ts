// 随机账号生成：用户名「焊工_XXXX / maker_XXXX」+ 16 位随机密码（大小写+数字）
const NAME_CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789';
const UPPER = 'ABCDEFGHJKLMNPQRSTUVWXYZ';
const LOWER = 'abcdefghijkmnpqrstuvwxyz';
const DIGITS = '23456789';
const PASS_ALL = UPPER + LOWER + DIGITS;

function randInt(max: number): number {
  const buf = new Uint32Array(1);
  crypto.getRandomValues(buf);
  return buf[0] % max;
}

function pick(chars: string, n: number): string {
  let out = '';
  for (let i = 0; i < n; i++) out += chars[randInt(chars.length)];
  return out;
}

export interface GeneratedCredentials {
  username: string;
  password: string;
}

export function generateCredentials(): GeneratedCredentials {
  const prefix = randInt(2) === 0 ? '焊工_' : 'maker_';
  const username = prefix + pick(NAME_CHARS, 4);
  // 保证至少 1 大写 + 1 小写 + 2 数字，其余随机
  const password =
    pick(UPPER, 1) +
    pick(LOWER, 1) +
    pick(DIGITS, 2) +
    pick(PASS_ALL, 12);
  // 洗牌打散固定位置
  const shuffled = password
    .split('')
    .map(ch => ({ ch, r: randInt(1_000_000) }))
    .sort((a, b) => a.r - b.r)
    .map(x => x.ch)
    .join('');
  return { username, password: shuffled };
}

/** 一键复制（clipboard API 失败时回退 execCommand） */
export async function copyText(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    try {
      const ta = document.createElement('textarea');
      ta.value = text;
      ta.style.position = 'fixed';
      ta.style.opacity = '0';
      document.body.appendChild(ta);
      ta.select();
      const ok = document.execCommand('copy');
      document.body.removeChild(ta);
      return ok;
    } catch {
      return false;
    }
  }
}
