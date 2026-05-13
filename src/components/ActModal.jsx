export default function ActModal({ act, onClose }) {
  if (!act) return null;
  const videoId = act.youtube.split('v=').pop()?.split('&')[0] || act.youtube;

  return (
    <div className="modal-backdrop" role="dialog" aria-modal="true">
      <div className="modal-card">
        <div className="modal-top">
          <div>
            <h2>{act.name}</h2>
            <p className="modal-info">{act.tagline}</p>
            <p className="modal-info">{act.stage} · {act.start}–{act.end}</p>
          </div>
          <button type="button" className="icon-button secondary-button" onClick={onClose}>
            Close
          </button>
        </div>
        <div className="modal-video">
          <iframe
            width="100%"
            height="100%"
            src={`https://www.youtube.com/embed/${videoId}`}
            title={act.name}
            frameBorder="0"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
          />
        </div>
        <p>{act.description}</p>
      </div>
    </div>
  );
}
