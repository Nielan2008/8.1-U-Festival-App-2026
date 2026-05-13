export default function ScheduleBlock({ stage, blocks, onSelect, favourites, toggleFavourite }) {
  const startMinutes = 10 * 60;
  const totalMinutes = 14 * 60 + 45;
  const totalHeight = 900;

  const getTop = (time) => {
    const [hour, minute] = time.split(':').map(Number);
    const minutes = hour * 60 + minute;
    return ((minutes - startMinutes) / totalMinutes) * totalHeight;
  };

  const getHeight = (start, end) => {
    const [h1, m1] = start.split(':').map(Number);
    const [h2, m2] = end.split(':').map(Number);
    return (((h2 * 60 + m2) - (h1 * 60 + m1)) / totalMinutes) * totalHeight;
  };

  return (
    <div className="stage-column" aria-label={stage}>
      <div className="schedule-column__header">{stage}</div>
      <div className="schedule-column" style={{ minHeight: `${totalHeight}px` }}>
        {blocks.map((block) => {
          const top = getTop(block.start);
          const height = getHeight(block.start, block.end);
          const isFav = favourites.includes(block.id);

          return (
            <div
              key={block.id}
              className="stage-block"
              onClick={() => onSelect(block)}
              style={{ top: `${top}px`, height: `${Math.max(height, 68)}px` }}
              role="button"
              tabIndex={0}
              onKeyPress={(event) => event.key === 'Enter' && onSelect(block)}
            >
              <span className="block-stage">{stage}</span>
              <h3 className="block-title">{block.title}</h3>
              <p className="block-time">{block.start} – {block.end}</p>
              <span
                className={`heart-button ${isFav ? 'active' : ''}`}
                onClick={(event) => {
                  event.stopPropagation();
                  toggleFavourite(block.id);
                }}
                role="button"
                tabIndex={0}
                aria-label={isFav ? 'Remove favourite' : 'Add favourite'}
              >
                {isFav ? '❤️' : '🤍'}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
