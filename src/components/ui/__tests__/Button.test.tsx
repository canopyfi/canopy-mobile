import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { Text } from 'react-native';
import { Button } from '../Button';

describe('Button', () => {
  const mockOnPress = jest.fn();

  beforeEach(() => {
    mockOnPress.mockClear();
  });

  describe('rendering', () => {
    it('should render children text', () => {
      const { getByText } = render(<Button onPress={mockOnPress}>Click me</Button>);
      expect(getByText('Click me')).toBeTruthy();
    });

    it('should render with default variant (primary)', () => {
      const { getByText } = render(<Button onPress={mockOnPress}>Button</Button>);
      const button = getByText('Button');
      expect(button).toBeTruthy();
    });

    it('should render with left icon', () => {
      const leftIcon = <Text testID="leftIcon">Icon</Text>;
      const { getByTestId } = render(
        <Button onPress={mockOnPress} leftIcon={leftIcon}>
          Button
        </Button>
      );
      expect(getByTestId('leftIcon')).toBeTruthy();
    });

    it('should render with right icon', () => {
      const rightIcon = <Text testID="rightIcon">Icon</Text>;
      const { getByTestId } = render(
        <Button onPress={mockOnPress} rightIcon={rightIcon}>
          Button
        </Button>
      );
      expect(getByTestId('rightIcon')).toBeTruthy();
    });
  });

  describe('variants', () => {
    it('should render primary variant', () => {
      const { getByText } = render(
        <Button onPress={mockOnPress} variant="primary">
          Primary
        </Button>
      );
      expect(getByText('Primary')).toBeTruthy();
    });

    it('should render secondary variant', () => {
      const { getByText } = render(
        <Button onPress={mockOnPress} variant="secondary">
          Secondary
        </Button>
      );
      expect(getByText('Secondary')).toBeTruthy();
    });

    it('should render outline variant', () => {
      const { getByText } = render(
        <Button onPress={mockOnPress} variant="outline">
          Outline
        </Button>
      );
      expect(getByText('Outline')).toBeTruthy();
    });

    it('should render ghost variant', () => {
      const { getByText } = render(
        <Button onPress={mockOnPress} variant="ghost">
          Ghost
        </Button>
      );
      expect(getByText('Ghost')).toBeTruthy();
    });

    it('should render destructive variant', () => {
      const { getByText } = render(
        <Button onPress={mockOnPress} variant="destructive">
          Destructive
        </Button>
      );
      expect(getByText('Destructive')).toBeTruthy();
    });
  });

  describe('sizes', () => {
    it('should render small size', () => {
      const { getByText } = render(
        <Button onPress={mockOnPress} size="sm">
          Small
        </Button>
      );
      expect(getByText('Small')).toBeTruthy();
    });

    it('should render medium size (default)', () => {
      const { getByText } = render(
        <Button onPress={mockOnPress} size="md">
          Medium
        </Button>
      );
      expect(getByText('Medium')).toBeTruthy();
    });

    it('should render large size', () => {
      const { getByText } = render(
        <Button onPress={mockOnPress} size="lg">
          Large
        </Button>
      );
      expect(getByText('Large')).toBeTruthy();
    });
  });

  describe('interactions', () => {
    it('should call onPress when pressed', () => {
      const { getByText } = render(<Button onPress={mockOnPress}>Click me</Button>);
      fireEvent.press(getByText('Click me'));
      expect(mockOnPress).toHaveBeenCalledTimes(1);
    });

    it('should not call onPress when disabled', () => {
      const { getByText } = render(
        <Button onPress={mockOnPress} disabled>
          Disabled
        </Button>
      );
      fireEvent.press(getByText('Disabled'));
      expect(mockOnPress).not.toHaveBeenCalled();
    });
  });

  describe('loading state', () => {
    it('should hide text when loading', () => {
      const { queryByText } = render(
        <Button onPress={mockOnPress} loading>
          Button
        </Button>
      );
      expect(queryByText('Button')).toBeNull();
    });
  });

  describe('disabled state', () => {
    it('should render with disabled appearance', () => {
      const { getByText } = render(
        <Button onPress={mockOnPress} disabled>
          Disabled
        </Button>
      );
      expect(getByText('Disabled')).toBeTruthy();
    });

    it('should render with loading state', () => {
      const { queryByText } = render(
        <Button onPress={mockOnPress} loading>
          Loading
        </Button>
      );
      // Text should be hidden when loading
      expect(queryByText('Loading')).toBeNull();
    });
  });

  describe('fullWidth', () => {
    it('should render fullWidth button', () => {
      const { getByText } = render(
        <Button onPress={mockOnPress} fullWidth>
          Full Width
        </Button>
      );
      // If it renders without error, the prop is working
      expect(getByText('Full Width')).toBeTruthy();
    });
  });

  describe('custom styles', () => {
    it('should render with custom style', () => {
      const customStyle = { marginTop: 10 };
      const { getByText } = render(
        <Button onPress={mockOnPress} style={customStyle}>
          Custom
        </Button>
      );
      expect(getByText('Custom')).toBeTruthy();
    });

    it('should render with custom text style', () => {
      const customTextStyle = { letterSpacing: 2 };
      const { getByText } = render(
        <Button onPress={mockOnPress} textStyle={customTextStyle}>
          Custom Text
        </Button>
      );
      expect(getByText('Custom Text')).toBeTruthy();
    });
  });
});
