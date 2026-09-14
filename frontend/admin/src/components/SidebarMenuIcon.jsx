function SidebarMenuIcon({ type }) {
  const commonProps = {
    width: 20,
    height: 20,
    viewBox: '0 0 24 24',
    fill: 'none',
    stroke: 'currentColor',
    strokeWidth: 1.8,
    strokeLinecap: 'round',
    strokeLinejoin: 'round',
  }

  return (
    <>
      {type === 'dashboard' && (
        <svg {...commonProps}>
          <rect x="3" y="3" width="7" height="7" rx="1" />
          <rect x="14" y="3" width="7" height="7" rx="1" />
          <rect x="3" y="14" width="7" height="7" rx="1" />
          <rect x="14" y="14" width="7" height="7" rx="1" />
        </svg>
      )}

      {type === 'users' && (
        <svg {...commonProps}>
          <circle cx="9" cy="7" r="4" />
          <path d="M2 21V19C2 16.7909 3.79086 15 6 15H12C14.2091 15 16 16.7909 16 19V21" />
          <path d="M16 4C17.727 4.444 19 6.013 19 7.88C19 9.747 17.727 11.316 16 11.76" />
          <path d="M22 21V19C22 17.17 20.77 15.58 19 15.14" />
        </svg>
      )}

      {type === 'inquiries' && (
        <svg {...commonProps}>
          <path d="M20 15C20 16.1046 19.1046 17 18 17H8L3 21V5C3 3.89543 3.89543 3 5 3H18C19.1046 3 20 3.89543 20 5V15Z" />
        </svg>
      )}
    </>
  )
}

export default SidebarMenuIcon