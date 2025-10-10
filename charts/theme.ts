// Chart theming for minimalist Stripe purple aesthetic
// Apply these colors to your existing chart library props

export const chartTheme = {
  lineColor: '#635BFF',
  areaFrom: 'rgba(99,91,255,0.25)',
  areaTo: 'rgba(99,91,255,0.03)',
  tick: '#94a3b8',
  grid: '#e9eaf2',
  donut: ['#635BFF', '#5b7cfd', '#944bff', '#23c6b7'],
  tooltip: {
    bg: '#ffffff',
    border: '#e9eaf2',
    shadow: '0 10px 30px rgba(17,24,39,.06)',
    radius: 14,
  },
};

// Usage example for Victory charts or similar:
// <VictoryLine
//   style={{
//     data: { stroke: chartTheme.lineColor },
//     grid: { stroke: chartTheme.grid },
//   }}
// />
