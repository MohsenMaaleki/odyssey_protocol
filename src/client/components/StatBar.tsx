import './StatBar.css';

export interface StatBarProps {
  label: string;
  icon: string;
  value: number;
  max: number;
  showPercentage?: boolean;
}

/**
 * Animated stat bar component for HUD display
 * Shows a labeled progress bar with icon and value
 */
export function StatBar({ label, icon, value, max, showPercentage = true }: StatBarProps) {
  const percentage = Math.max(0, Math.min(100, (value / max) * 100));
  const displayValue = showPercentage ? `${Math.round(percentage)}%` : value;

  // Color coding based on value
  const getColorClass = (): string => {
    if (percentage >= 70) return 'stat-bar-good';
    if (percentage >= 40) return 'stat-bar-warning';
    return 'stat-bar-danger';
  };

  return (
    <div className="stat-bar-container">
      <div className="stat-bar-header">
        <span className="stat-bar-icon">{icon}</span>
        <span className="stat-bar-label">{label}</span>
        <span className="stat-bar-value">{displayValue}</span>
      </div>
      <div className="stat-bar-track">
        <div
          className={`stat-bar-fill ${getColorClass()}`}
          style={{ width: `${percentage}%` }}
        />
      </div>
    </div>
  );
}
