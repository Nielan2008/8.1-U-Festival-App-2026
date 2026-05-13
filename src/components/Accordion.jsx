import { useState } from 'react';

export default function Accordion({ items }) {
  const [openIndex, setOpenIndex] = useState(0);

  return (
    <div className="accordion">
      {items.map((item, index) => (
        <div className="accordion-item" key={item.title}>
          <button
            type="button"
            className="accordion-header"
            onClick={() => setOpenIndex(openIndex === index ? -1 : index)}
            aria-expanded={openIndex === index}
          >
            <h3>{item.title}</h3>
            <span>{openIndex === index ? '−' : '+'}</span>
          </button>
          {openIndex === index ? (
            <div className="accordion-content">
              {item.content.map((line, idx) => (
                <p key={idx}>{line}</p>
              ))}
            </div>
          ) : null}
        </div>
      ))}
    </div>
  );
}
