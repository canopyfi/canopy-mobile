import React from 'react';
import { render } from '@testing-library/react-native';
import { Badge } from '../Badge';

describe('Badge', () => {
  describe('rendering', () => {
    it('should render children text', () => {
      const { getByText } = render(<Badge>Badge Text</Badge>);
      expect(getByText('Badge Text')).toBeTruthy();
    });

    it('should render with default variant', () => {
      const { getByText } = render(<Badge>Default</Badge>);
      expect(getByText('Default')).toBeTruthy();
    });
  });

  describe('variants', () => {
    it('should render default variant', () => {
      const { getByText } = render(<Badge variant="default">Default</Badge>);
      expect(getByText('Default')).toBeTruthy();
    });

    it('should render secondary variant', () => {
      const { getByText } = render(<Badge variant="secondary">Secondary</Badge>);
      expect(getByText('Secondary')).toBeTruthy();
    });

    it('should render success variant', () => {
      const { getByText } = render(<Badge variant="success">Success</Badge>);
      expect(getByText('Success')).toBeTruthy();
    });

    it('should render warning variant', () => {
      const { getByText } = render(<Badge variant="warning">Warning</Badge>);
      expect(getByText('Warning')).toBeTruthy();
    });

    it('should render error variant', () => {
      const { getByText } = render(<Badge variant="error">Error</Badge>);
      expect(getByText('Error')).toBeTruthy();
    });

    it('should render outline variant', () => {
      const { getByText } = render(<Badge variant="outline">Outline</Badge>);
      expect(getByText('Outline')).toBeTruthy();
    });
  });

  describe('custom color', () => {
    it('should apply custom color when provided', () => {
      const customColor = '#FF5500';
      const { getByText } = render(<Badge color={customColor}>Custom</Badge>);
      const badge = getByText('Custom');
      // Check that the text has the custom color applied
      const style = badge.props.style;
      const hasCustomColor = Array.isArray(style)
        ? style.some((s) => s?.color === customColor)
        : style?.color === customColor;
      expect(hasCustomColor).toBeTruthy();
    });

    it('should override variant when custom color is provided', () => {
      const customColor = '#FF5500';
      const { getByText } = render(
        <Badge variant="success" color={customColor}>
          Custom Override
        </Badge>
      );
      const badge = getByText('Custom Override');
      const style = badge.props.style;
      const hasCustomColor = Array.isArray(style)
        ? style.some((s) => s?.color === customColor)
        : style?.color === customColor;
      expect(hasCustomColor).toBeTruthy();
    });
  });

  describe('custom styles', () => {
    it('should apply custom style to container', () => {
      const customStyle = { marginRight: 10 };
      const { UNSAFE_root } = render(<Badge style={customStyle}>Styled</Badge>);
      const style = UNSAFE_root.props.style;
      const hasCustomStyle = Array.isArray(style)
        ? style.some((s) => s?.marginRight === 10)
        : style?.marginRight === 10;
      expect(hasCustomStyle).toBeTruthy();
    });

    it('should apply custom text style', () => {
      const customTextStyle = { fontWeight: 'bold' as const };
      const { getByText } = render(<Badge textStyle={customTextStyle}>Bold Badge</Badge>);
      const badge = getByText('Bold Badge');
      const style = badge.props.style;
      const hasCustomTextStyle = Array.isArray(style)
        ? style.some((s) => s?.fontWeight === 'bold')
        : style?.fontWeight === 'bold';
      expect(hasCustomTextStyle).toBeTruthy();
    });
  });

  describe('different content types', () => {
    it('should render numeric content', () => {
      const { getByText } = render(<Badge>42</Badge>);
      expect(getByText('42')).toBeTruthy();
    });

    it('should render status-like content', () => {
      const { getByText } = render(<Badge variant="success">Active</Badge>);
      expect(getByText('Active')).toBeTruthy();
    });
  });
});
