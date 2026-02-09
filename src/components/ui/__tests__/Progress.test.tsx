import React from 'react';
import { View } from 'react-native';
import { render } from '@testing-library/react-native';
import { Progress } from '../Progress';

describe('Progress', () => {
  describe('rendering', () => {
    it('should render progress bar', () => {
      const { UNSAFE_root } = render(<Progress value={50} />);
      expect(UNSAFE_root).toBeTruthy();
    });

    it('should render container and fill views', () => {
      const { UNSAFE_getAllByType } = render(<Progress value={50} />);
      const views = UNSAFE_getAllByType(View);
      // Should have container and fill
      expect(views.length).toBeGreaterThanOrEqual(2);
    });
  });

  describe('value calculation', () => {
    it('should calculate percentage correctly with default max', () => {
      const { UNSAFE_getAllByType } = render(<Progress value={50} />);
      const views = UNSAFE_getAllByType(View);
      const fillView = views[1]; // Second view is the fill
      const style = fillView.props.style;
      const hasWidth = Array.isArray(style)
        ? style.some((s) => s?.width === '50%')
        : style?.width === '50%';
      expect(hasWidth).toBeTruthy();
    });

    it('should calculate percentage correctly with custom max', () => {
      const { UNSAFE_getAllByType } = render(<Progress value={25} max={50} />);
      const views = UNSAFE_getAllByType(View);
      const fillView = views[1];
      const style = fillView.props.style;
      const hasWidth = Array.isArray(style)
        ? style.some((s) => s?.width === '50%')
        : style?.width === '50%';
      expect(hasWidth).toBeTruthy();
    });

    it('should clamp value to 0% when negative', () => {
      const { UNSAFE_getAllByType } = render(<Progress value={-10} />);
      const views = UNSAFE_getAllByType(View);
      const fillView = views[1];
      const style = fillView.props.style;
      const hasWidth = Array.isArray(style)
        ? style.some((s) => s?.width === '0%')
        : style?.width === '0%';
      expect(hasWidth).toBeTruthy();
    });

    it('should clamp value to 100% when exceeds max', () => {
      const { UNSAFE_getAllByType } = render(<Progress value={150} max={100} />);
      const views = UNSAFE_getAllByType(View);
      const fillView = views[1];
      const style = fillView.props.style;
      const hasWidth = Array.isArray(style)
        ? style.some((s) => s?.width === '100%')
        : style?.width === '100%';
      expect(hasWidth).toBeTruthy();
    });

    it('should handle value of 0', () => {
      const { UNSAFE_getAllByType } = render(<Progress value={0} />);
      const views = UNSAFE_getAllByType(View);
      const fillView = views[1];
      const style = fillView.props.style;
      const hasWidth = Array.isArray(style)
        ? style.some((s) => s?.width === '0%')
        : style?.width === '0%';
      expect(hasWidth).toBeTruthy();
    });

    it('should handle value equal to max (100%)', () => {
      const { UNSAFE_getAllByType } = render(<Progress value={100} max={100} />);
      const views = UNSAFE_getAllByType(View);
      const fillView = views[1];
      const style = fillView.props.style;
      const hasWidth = Array.isArray(style)
        ? style.some((s) => s?.width === '100%')
        : style?.width === '100%';
      expect(hasWidth).toBeTruthy();
    });
  });

  describe('custom colors', () => {
    it('should apply custom fill color', () => {
      const customColor = '#FF5500';
      const { UNSAFE_getAllByType } = render(<Progress value={50} color={customColor} />);
      const views = UNSAFE_getAllByType(View);
      const fillView = views[1];
      const style = fillView.props.style;
      const hasCustomColor = Array.isArray(style)
        ? style.some((s) => s?.backgroundColor === customColor)
        : style?.backgroundColor === customColor;
      expect(hasCustomColor).toBeTruthy();
    });

    it('should apply custom background color', () => {
      const customBgColor = '#333333';
      const { UNSAFE_getAllByType } = render(
        <Progress value={50} backgroundColor={customBgColor} />
      );
      const views = UNSAFE_getAllByType(View);
      const containerView = views[0];
      const style = containerView.props.style;
      const hasCustomBgColor = Array.isArray(style)
        ? style.some((s) => s?.backgroundColor === customBgColor)
        : style?.backgroundColor === customBgColor;
      expect(hasCustomBgColor).toBeTruthy();
    });
  });

  describe('custom height', () => {
    it('should apply custom height', () => {
      const customHeight = 12;
      const { UNSAFE_getAllByType } = render(<Progress value={50} height={customHeight} />);
      const views = UNSAFE_getAllByType(View);
      const containerView = views[0];
      const style = containerView.props.style;
      const hasCustomHeight = Array.isArray(style)
        ? style.some((s) => s?.height === customHeight)
        : style?.height === customHeight;
      expect(hasCustomHeight).toBeTruthy();
    });

    it('should use default height of 6', () => {
      const { UNSAFE_getAllByType } = render(<Progress value={50} />);
      const views = UNSAFE_getAllByType(View);
      const containerView = views[0];
      const style = containerView.props.style;
      const hasDefaultHeight = Array.isArray(style)
        ? style.some((s) => s?.height === 6)
        : style?.height === 6;
      expect(hasDefaultHeight).toBeTruthy();
    });
  });

  describe('custom style', () => {
    it('should apply custom style to container', () => {
      const customStyle = { marginTop: 20 };
      const { UNSAFE_getAllByType } = render(<Progress value={50} style={customStyle} />);
      const views = UNSAFE_getAllByType(View);
      const containerView = views[0];
      const style = containerView.props.style;
      const hasCustomStyle = Array.isArray(style)
        ? style.some((s) => s?.marginTop === 20)
        : style?.marginTop === 20;
      expect(hasCustomStyle).toBeTruthy();
    });
  });

  describe('edge cases', () => {
    it('should handle decimal values', () => {
      const { UNSAFE_getAllByType } = render(<Progress value={33.33} />);
      const views = UNSAFE_getAllByType(View);
      const fillView = views[1];
      const style = fillView.props.style;
      // Should render without error
      expect(style).toBeTruthy();
    });

    it('should handle very small max value', () => {
      const { UNSAFE_getAllByType } = render(<Progress value={0.5} max={1} />);
      const views = UNSAFE_getAllByType(View);
      const fillView = views[1];
      const style = fillView.props.style;
      const hasWidth = Array.isArray(style)
        ? style.some((s) => s?.width === '50%')
        : style?.width === '50%';
      expect(hasWidth).toBeTruthy();
    });
  });
});
