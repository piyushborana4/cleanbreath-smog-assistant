// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest';
import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import { AqiGauge } from '../../src/components/AqiGauge';

afterEach(() => {
  document.documentElement.classList.remove('reduce-motion');
  cleanup();
});

describe('AqiGauge (D3.js severity gauge)', () => {
  it('renders all 6 color-coded severity bands and highlights the active category', () => {
    const { container } = render(
      <AqiGauge aqi={245} category="very_unhealthy" categoryLabel="Very Unhealthy" language="en" />,
    );

    const bands = container.querySelectorAll('path[data-aqi-band]');
    expect(bands).toHaveLength(6);

    const activeBands = container.querySelectorAll('path[data-active="true"]');
    expect(activeBands).toHaveLength(1);
    expect(activeBands[0]).toHaveAttribute('data-aqi-band', 'very_unhealthy');

    expect(
      screen.getByRole('img', {
        name: /Air Quality Index gauge: 245 on 0 to 500 scale, Very Unhealthy/i,
      }),
    ).toBeInTheDocument();
    expect(screen.getByText('AQI 245')).toBeInTheDocument();
    expect(screen.getByText('201–300 US AQI')).toBeInTheDocument();
  });

  it('clamps out-of-range AQI values cleanly and supports reduced motion updates', () => {
    document.documentElement.classList.add('reduce-motion');

    const { rerender, container } = render(
      <AqiGauge aqi={-15} category="good" categoryLabel="Good" language="en" />,
    );
    expect(screen.getByText('AQI 0')).toBeInTheDocument();
    expect(container.querySelector('path[data-aqi-band="good"]')).toHaveAttribute(
      'data-active',
      'true',
    );

    rerender(
      <AqiGauge aqi={640} category="severe" categoryLabel="Severe / Hazardous" language="en" />,
    );
    expect(screen.getByText('AQI 500')).toBeInTheDocument();
    expect(container.querySelector('path[data-aqi-band="severe"]')).toHaveAttribute(
      'data-active',
      'true',
    );
  });

  it('supports Hindi labels and transitions smoothly when motion is enabled', () => {
    const { rerender } = render(
      <AqiGauge
        aqi={125}
        category="sensitive"
        categoryLabel="संवेदनशील समूहों के लिए अस्वस्थ"
        language="hi"
      />,
    );

    expect(
      screen.getByRole('img', {
        name: /वायु गुणवत्ता सूचकांक गेज: 125/,
      }),
    ).toBeInTheDocument();
    expect(screen.getByText('संवेदनशील')).toBeInTheDocument();

    rerender(
      <AqiGauge aqi={175} category="unhealthy" categoryLabel="अस्वस्थ (Unhealthy)" language="hi" />,
    );
    expect(screen.getByText('AQI 175')).toBeInTheDocument();
  });
});
