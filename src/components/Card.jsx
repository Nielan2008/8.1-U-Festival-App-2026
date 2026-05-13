export default function Card({ title, text, timestamp }) {
  return (
    <article className="card">
      <h3>{title}</h3>
      <p>{text}</p>
      {timestamp ? <time dateTime={timestamp}>{new Date(timestamp).toLocaleString()}</time> : null}
    </article>
  );
}
