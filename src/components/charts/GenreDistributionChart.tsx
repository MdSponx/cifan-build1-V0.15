import React from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from 'recharts';
import { useTranslation } from 'react-i18next';
import { useTypography } from '../../utils/typography';
import { GenreStats } from '../../types/admin.types';
import ChartContainer from '../ui/ChartContainer';

interface GenreDistributionChartProps {
  data: GenreStats[];
  loading?: boolean;

const GenreDistributionChart: React.FC<GenreDistributionChartProps> = ({
  data,
  loading = false,
export default GenreDistributionChart;