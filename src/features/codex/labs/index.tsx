/* eslint-disable react-refresh/only-export-components */
import type { LabKind } from '../data/entries';
import BandsLab from './BandsLab';
import RcLab from './RcLab';
import LedLab from './LedLab';
import OpAmpLab from './OpAmpLab';

export const LAB_TITLES: Record<LabKind, string> = {
  bands: '色环电阻练习器',
  rc: 'RC 充放电曲线',
  led: 'LED 限流电阻计算器',
  opamp: '运放增益与削顶演示',
};

export const LAB_DESCS: Record<LabKind, string> = {
  bands: '随机出题，看环读值或给值涂环，连对计数。',
  rc: '拖 R / C 滑杆，指数曲线实时重绘，τ 点自动标注。',
  led: '输入 Vcc / Vf / 目标电流，推荐 E24 阻值并校核功耗。',
  opamp: '反相 / 同相增益调节，输出波形与削顶饱和实时可视。',
};

export default function Lab({ kind }: { kind: LabKind }) {
  switch (kind) {
    case 'bands':
      return <BandsLab />;
    case 'rc':
      return <RcLab />;
    case 'led':
      return <LedLab />;
    case 'opamp':
      return <OpAmpLab />;
  }
}
