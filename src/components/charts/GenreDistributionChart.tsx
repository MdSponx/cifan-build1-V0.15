import React from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from 'recharts';
import { useTranslation } from 'react-i18next';
import { useTypography } from '../../utils/typography';
import { GenreStats } from '../../types/admin.types';
import ChartContainer from '../ui/ChartContainer';

interface GenreDistributionChartProps {
  data: GenreStats[];
  loading?: boolean;
}

const GenreDistributionChart: React.FC<GenreDistributionChartProps> = ({
  data,
  loading = false,
}) => {
  const { t } = useTranslation();
  const { getResponsiveFontSize } = useTypography();

  const COLORS = [
    '#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4', '#FFEAA7',
    '#DDA0DD', '#98D8C8', '#F7DC6F', '#BB8FCE', '#85C1E9',
    '#F8C471', '#82E0AA'
  ];

  if (loading) {
    return (
      <ChartContainer title={t('admin.dashboard.genreDistribution')}>
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
        </div>
      </ChartContainer>
    );
  }

  if (!data || data.length === 0) {
    return (
      <ChartContainer title={t('admin.dashboard.genreDistribution')}>
        <div className="flex items-center justify-center h-64 text-gray-500">
          {t('admin.dashboard.noData')}
        </div>
      </ChartContainer>
    );
  }

  const chartData = data.map((item, index) => ({
    ...item,
    fill: COLORS[index % COLORS.length]
  }));

  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="bg-white p-3 rounded-lg shadow-lg border">
          <p className="font-medium">{data.genre}</p>
          <p className="text-sm text-gray-600">
            {t('admin.dashboard.count')}: {data.count}
          </p>
          <p className="text-sm text-gray-600">
            {data.percentage}%
          </p>
        </div>
      );
    }
    return null;
  };

  return (
    <ChartContainer title={t('admin.dashboard.genreDistribution')}>
      <ResponsiveContainer width="100%" height={400}>
        <PieChart>
          <Pie
            data={chartData}
            cx="50%"
            cy="50%"
            innerRadius={60}
            outerRadius={120}
            paddingAngle={2}
            dataKey="count"
          >
            {chartData.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={entry.fill} />
            ))}
          </Pie>
          <Tooltip content={<CustomTooltip />} />
          <Legend 
            verticalAlign="bottom" 
            height={36}
            formatter={(value, entry: any) => (
              <span style={{ color: entry.color, fontSize: getResponsiveFontSize('sm') }}>
                {value} ({entry.payload.percentage}%)
              </span>
            )}
          />
        </PieChart>
      </ResponsiveContainer>
    </ChartContainer>
  );
};

export default GenreDistributionChart;