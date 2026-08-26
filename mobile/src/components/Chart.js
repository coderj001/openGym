import React from 'react';
import { View } from 'react-native';
import Svg, { Line, Path } from 'react-native-svg';
import { AppText, useColors } from './ui';
import { fmtNum } from '../lib/format';

export default function Chart({ points = [], height = 150, unit = '', color }) {
  const colors = useColors(); const width = 320;
  if (points.length < 2) return <View style={{ height, alignItems: 'center', justifyContent: 'center' }}><AppText muted>{points.length ? `${fmtNum(points[0].y)} ${unit}` : 'No data yet'}</AppText></View>;
  const values = points.map(point => Number(point.y)); const min = Math.min(...values); const max = Math.max(...values); const spread = max - min || 1;
  const path = points.map((point, index) => { const x = index / (points.length - 1) * (width - 20) + 10; const y = height - 15 - (point.y - min) / spread * (height - 35); return `${index ? 'L' : 'M'}${x},${y}`; }).join(' ');
  return <View><Svg width="100%" height={height} viewBox={`0 0 ${width} ${height}`}><Line x1="10" y1={height - 15} x2={width - 10} y2={height - 15} stroke={colors.border} /><Path d={path} fill="none" stroke={color || colors.accent} strokeWidth="3" strokeLinejoin="round" strokeLinecap="round" /></Svg><View style={{ flexDirection: 'row', justifyContent: 'space-between' }}><AppText dim style={{ fontSize: 11 }}>{fmtNum(min)} {unit}</AppText><AppText dim style={{ fontSize: 11 }}>{fmtNum(max)} {unit}</AppText></View></View>;
}
