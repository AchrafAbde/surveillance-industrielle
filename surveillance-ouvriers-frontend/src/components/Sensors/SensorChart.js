import React from 'react';
import { Box, Typography } from '@mui/material';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { format, parseISO } from 'date-fns';
import { fr } from 'date-fns/locale';

/**
 * SensorChart component displays a line chart for sensor data
 */
const SensorChart = ({ data, sensorType }) => {
  // If no data, show a message
  if (!data || data.length === 0) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: 200 }}>
        <Typography variant="body2" color="text.secondary">
          Aucune donnée disponible
        </Typography>
      </Box>
    );
  }

  // Prepare the data for the chart
  const chartData = data.map(item => {
    // Parse the timestamp
    let timeLabel;
    try {
      const date = parseISO(item.timestamp);
      timeLabel = format(date, 'HH:mm:ss', { locale: fr });
    } catch (error) {
      timeLabel = 'Inconnu';
    }

    return {
      time: timeLabel,
      value: item.value,
      rawTimestamp: item.timestamp
    };
  });

  // Sort the data chronologically
  chartData.sort((a, b) => {
    return new Date(a.rawTimestamp) - new Date(b.rawTimestamp);
  });

  // Get the unit based on sensor type
  const getUnit = () => {
    switch (sensorType) {
      case 'temperature':
        return '°C';
      case 'pressure':
        return 'bar';
      case 'vibration':
        return 'Hz';
      case 'hydraulic_level':
        return '%';
      case 'spindle_speed':
        return 'RPM';
      case 'coolant_level':
        return '%';
      default:
        return '';
    }
  };

  // Get color based on sensor type
  const getLineColor = () => {
    switch (sensorType) {
      case 'temperature':
        return '#ff5722';
      case 'pressure':
        return '#2196f3';
      case 'vibration':
        return '#673ab7';
      case 'hydraulic_level':
        return '#4caf50';
      case 'spindle_speed':
        return '#f44336';
      case 'coolant_level':
        return '#03a9f4';
      default:
        return '#9e9e9e';
    }
  };

  // Custom tooltip formatter
  const renderTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
      return (
        <div style={{ 
          backgroundColor: '#fff', 
          padding: '5px 10px', 
          border: '1px solid #ccc',
          borderRadius: '4px'
        }}>
          <p style={{ margin: 0 }}>{`Temps: ${label}`}</p>
          <p style={{ 
            margin: 0, 
            color: getLineColor(),
            fontWeight: 'bold'
          }}>
            {`Valeur: ${payload[0].value} ${getUnit()}`}
          </p>
        </div>
      );
    }
    return null;
  };

  return (
    <Box sx={{ width: '100%', height: 250 }}>
      <ResponsiveContainer>
        <LineChart
          data={chartData}
          margin={{
            top: 10,
            right: 30,
            left: 0,
            bottom: 0,
          }}
        >
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis 
            dataKey="time"
            tick={{ fontSize: 12 }}
            tickCount={5}
          />
          <YAxis 
            tick={{ fontSize: 12 }}
            label={{ 
              value: getUnit(), 
              angle: -90, 
              position: 'insideLeft',
              style: { textAnchor: 'middle' }
            }} 
          />
          <Tooltip content={renderTooltip} />
          <Line
            type="monotone"
            dataKey="value"
            stroke={getLineColor()}
            activeDot={{ r: 8 }}
            strokeWidth={2}
            dot={{ r: 3 }}
          />
        </LineChart>
      </ResponsiveContainer>
    </Box>
  );
};

export default SensorChart;
