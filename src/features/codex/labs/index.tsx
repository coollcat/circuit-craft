/* eslint-disable react-refresh/only-export-components */
import type { LabKind } from '../data/entries';
import BandsLab from './BandsLab';
import RcLab from './RcLab';
import LedLab from './LedLab';
import OpAmpLab from './OpAmpLab';
import PullUpLab from './PullUpLab';
import HystLab from './HystLab';

export const LAB_TITLES: Record<LabKind, string> = {
  bands: '色环电阻练习器',
  rc: 'RC 充放电曲线',
  led: 'LED 限流电阻计算器',
  opamp: '运放增益与削顶演示',
  pullup: '上拉 / 下拉电阻',
  hyst: '迟滞比较器（施密特）',
};

export const LAB_DESCS: Record<LabKind, string> = {
  bands: '随机出题，看环读值或给值涂环，连对计数。',
  rc: '拖 R / C 滑杆，指数曲线实时重绘，τ 点自动标注。',
  led: '输入 Vcc / Vf / 目标电流，推荐 E24 阻值并校核功耗。',
  opamp: '反相 / 同相增益调节，输出波形与削顶饱和实时可视。',
  pullup: '上拉 / 下拉 / 悬空三种接法对比，按住按键看节点电压。',
  hyst: '拖 Rf/Rth/噪声，看迟滞回线与翻转次数：噪声被窗口吃掉。',
};

export default function Lab({ kind }: { kind: LabKind }) {
  switch (kind) {
    case 'bands':
      return (
        <>
          <BandsLab />
          {/* 进阶实验：标题/描述统一引自 LAB_TITLES / LAB_DESCS（单一来源） */}
          <div className="mt-6 border-t border-ink-700 pt-6">
            <h4 className="mb-1 font-mono text-xs uppercase tracking-widest text-sig-cyan">
              进阶实验 · {LAB_TITLES.pullup}
            </h4>
            <p className="mb-4 text-xs text-silk-500">{LAB_DESCS.pullup}</p>
            <PullUpLab />
          </div>
        </>
      );
    case 'rc':
      return <RcLab />;
    case 'led':
      return <LedLab />;
    case 'opamp':
      return <OpAmpLab />;
    case 'pullup':
      return <PullUpLab />;
    case 'hyst':
      return <HystLab />;
  }
}
