export default function ThemeToggle({ theme, onToggle }) {
  return (
    <button type="button" className="theme-button" onClick={onToggle} aria-label="Toggle theme">
      {theme === 'dark' ? '🌙' : '☀️'}
    </button>
  );
}
