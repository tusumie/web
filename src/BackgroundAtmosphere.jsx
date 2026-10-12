const clouds = [
  String.raw`       .--.
    .-(    ).
   (___.__)__)`,
  String.raw`          .-~~~-.
     .-~~(       )
  .-(             )-.
 (___________________)`,
  String.raw`        .-.
     .-(   )-.
  .-(         )-.
 (_______________)`,
];

export default function BackgroundAtmosphere({ playing, title, trackId }) {
  const spacedTitle = Array.from(title.replace(/\s/g, '')).join(' ');

  return (
    <div className={`background-atmosphere${playing ? ' is-playing' : ''}`} aria-hidden="true">
      {clouds.map((cloud, index) => (
        <pre key={index} className={`ascii-cloud cloud-${index + 1}`}>{cloud}</pre>
      ))}
      {['title-lane', 'title-lane title-lane-alt'].map((className) => (
        <div key={className} className={className}>
          <div key={trackId} className="title-stream">
            <span className="title-copy">{spacedTitle}</span>
            <span className="title-copy">{spacedTitle}</span>
          </div>
        </div>
      ))}
    </div>
  );
}
