import { useState } from 'react';

export default function Accordion({ items }) {
  const [openIndex, setOpenIndex] = useState(0);

  return (
    <div className="accordion">
      {items.map((item, index) => {
        const isOpen = openIndex === index;

        return (
          <div className="accordion-item" key={item.title}>
            <button
              type="button"
              className={`accordion-header ${isOpen ? 'expanded' : ''}`}
              onClick={() => setOpenIndex(isOpen ? -1 : index)}
              aria-expanded={isOpen}
            >
              <span className="accordion-title">{item.title}</span>
              <span className="accordion-chevron" aria-hidden="true">⌄</span>
            </button>
            <div className={`accordion-content-wrapper ${isOpen ? 'open' : ''}`} aria-hidden={!isOpen}>
              <div className="accordion-content">
                {item.content.map((line, idx) => (
                  <p key={idx}>{line}</p>
                ))}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
