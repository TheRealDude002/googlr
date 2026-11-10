'use client';

import SkeuButton from '../SkeuButton';

interface PreviewProps {
  previewUrl: string;
  error: string;
  onBack: () => void;
  onSearch: () => void;
  onChooseDifferent: () => void;
}

export default function Preview({ previewUrl, error, onBack, onSearch, onChooseDifferent }: PreviewProps) {
  return (
    <div className="screen-fade">
      <nav className="googlr-nav" aria-label="Googlr">
        <span className="wordmark">Googlr</span>
        <SkeuButton variant="secondary" small onClick={onBack} aria-label="Go back">
          ← Back
        </SkeuButton>
      </nav>

      <figure className="preview-frame" aria-label="Image you are about to search">
        <img src={previewUrl} alt="The image you selected, ready to search" className="preview-img" />
      </figure>

      {error ? (
        <p className="error-note" role="alert">
          {error}
        </p>
      ) : null}

      <SkeuButton variant="cta" block onClick={onSearch}>
        <span className="emoji" aria-hidden="true">🔍</span> Search This Image
      </SkeuButton>

      <button type="button" className="text-link" onClick={onChooseDifferent}>
        choose a different image
      </button>
    </div>
  );
}
