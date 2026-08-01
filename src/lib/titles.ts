// 称号体系（全站唯一来源）——Navbar 徽章 / 章节地图玩家面板 / 毕业证书共用
// 星数阶梯取 chapters.md 的 0/15/40/70/100/120 阈值；顶级为「首席硬件工程师」。
// 「首席打板人」是毕业设计完成后的专属荣誉，只出现在毕业证书上，不占星数阶梯。

export interface TitleTier {
  /** 达到该称号所需的总星数（含） */
  min: number;
  title: string;
}

/** 星数称号阶梯（降序排列，取第一个命中的档位） */
export const TITLE_TIERS: readonly TitleTier[] = [
  { min: 120, title: '首席硬件工程师' },
  { min: 100, title: '资深硬件工程师' },
  { min: 70, title: '硬件工程师' },
  { min: 40, title: '助理工程师' },
  { min: 15, title: '学徒' },
  { min: 0, title: '见习焊工' },
] as const;

/** 毕业设计完成（下单）后的专属荣誉称号，仅在毕业证书场景使用 */
export const GRADUATION_HONOR = '首席打板人';

/** 按总星数查称号 */
export function titleForStars(stars: number): string {
  for (const t of TITLE_TIERS) {
    if (stars >= t.min) return t.title;
  }
  return TITLE_TIERS[TITLE_TIERS.length - 1].title;
}
