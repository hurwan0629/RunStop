function DashboardCardIcon({ type }) {
  const commonProps = {
    width: 25,
    height: 25,
    viewBox: '0 0 24 24',
    fill: 'none',
    stroke: 'currentColor',
    strokeWidth: 1.8,
    strokeLinecap: 'round',
    strokeLinejoin: 'round',
  }

  return (
    <span className="dashboard-card-icon">
      {type === 'users' && (
        <svg {...commonProps}>
          <path d="M16 21V19C16 16.7909 14.2091 15 12 15H6C3.79086 15 2 16.7909 2 19V21" />
          <circle cx="9" cy="7" r="4" />
          <path d="M22 21V19C21.9986 17.1795 20.7679 15.5899 19 15.15" />
          <path d="M16 3.13C17.7721 3.58317 19.0078 5.17472 19.0078 7.00499C19.0078 8.83527 17.7721 10.4268 16 10.88" />
        </svg>
      )}

      {type === 'userPlus' && (
        <svg {...commonProps}>
          <circle cx="8" cy="7" r="4" />
          <path d="M2 21V19C2 16.7909 3.79086 15 6 15H10" />
          <path d="M19 8V14" />
          <path d="M16 11H22" />
        </svg>
      )}

      {type === 'message' && (
        <svg {...commonProps}>
          <path d="M21 15C21 16.1046 20.1046 17 19 17H8L3 21V5C3 3.89543 3.89543 3 5 3H19C20.1046 3 21 3.89543 21 5V15Z" />
        </svg>
      )}

      {type === 'checkCircle' && (
        <svg {...commonProps}>
          <circle cx="12" cy="12" r="9" />
          <path d="M8 12L10.8 14.8L16.5 9.2" />
        </svg>
      )}
    </span>
  )
}

export default DashboardCardIcon