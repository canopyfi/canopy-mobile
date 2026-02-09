import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { Text } from 'react-native';
import { Card, CardHeader, CardContent, CardFooter } from '../Card';

describe('Card', () => {
  describe('rendering', () => {
    it('should render children', () => {
      const { getByText } = render(
        <Card>
          <Text>Card Content</Text>
        </Card>
      );
      expect(getByText('Card Content')).toBeTruthy();
    });

    it('should render with custom style', () => {
      const customStyle = { marginTop: 20 };
      const { getByText } = render(
        <Card style={customStyle}>
          <Text>Card Content</Text>
        </Card>
      );
      expect(getByText('Card Content')).toBeTruthy();
    });
  });

  describe('noPadding', () => {
    it('should render with noPadding prop', () => {
      const { getByText } = render(
        <Card noPadding>
          <Text>No Padding</Text>
        </Card>
      );
      expect(getByText('No Padding')).toBeTruthy();
    });
  });

  describe('onPress', () => {
    it('should be touchable when onPress is provided', () => {
      const mockOnPress = jest.fn();
      const { getByText } = render(
        <Card onPress={mockOnPress}>
          <Text>Touchable Card</Text>
        </Card>
      );

      fireEvent.press(getByText('Touchable Card'));
      expect(mockOnPress).toHaveBeenCalledTimes(1);
    });

    it('should render static card when onPress is not provided', () => {
      const { getByText } = render(
        <Card>
          <Text>Static Card</Text>
        </Card>
      );
      expect(getByText('Static Card')).toBeTruthy();
    });
  });
});

describe('CardHeader', () => {
  it('should render children', () => {
    const { getByText } = render(
      <Card>
        <CardHeader>
          <Text>Header</Text>
        </CardHeader>
      </Card>
    );
    expect(getByText('Header')).toBeTruthy();
  });

  it('should apply custom style', () => {
    const customStyle = { paddingBottom: 20 };
    const { getByText } = render(
      <Card>
        <CardHeader style={customStyle}>
          <Text>Styled Header</Text>
        </CardHeader>
      </Card>
    );
    expect(getByText('Styled Header')).toBeTruthy();
  });
});

describe('CardContent', () => {
  it('should render children', () => {
    const { getByText } = render(
      <Card>
        <CardContent>
          <Text>Content</Text>
        </CardContent>
      </Card>
    );
    expect(getByText('Content')).toBeTruthy();
  });

  it('should apply custom style', () => {
    const customStyle = { paddingHorizontal: 20 };
    const { getByText } = render(
      <Card>
        <CardContent style={customStyle}>
          <Text>Styled Content</Text>
        </CardContent>
      </Card>
    );
    expect(getByText('Styled Content')).toBeTruthy();
  });
});

describe('CardFooter', () => {
  it('should render children', () => {
    const { getByText } = render(
      <Card>
        <CardFooter>
          <Text>Footer</Text>
        </CardFooter>
      </Card>
    );
    expect(getByText('Footer')).toBeTruthy();
  });

  it('should apply custom style', () => {
    const customStyle = { paddingTop: 20 };
    const { getByText } = render(
      <Card>
        <CardFooter style={customStyle}>
          <Text>Styled Footer</Text>
        </CardFooter>
      </Card>
    );
    expect(getByText('Styled Footer')).toBeTruthy();
  });
});

describe('Card composition', () => {
  it('should render full card with header, content, and footer', () => {
    const { getByText } = render(
      <Card>
        <CardHeader>
          <Text>Header Text</Text>
        </CardHeader>
        <CardContent>
          <Text>Content Text</Text>
        </CardContent>
        <CardFooter>
          <Text>Footer Text</Text>
        </CardFooter>
      </Card>
    );

    expect(getByText('Header Text')).toBeTruthy();
    expect(getByText('Content Text')).toBeTruthy();
    expect(getByText('Footer Text')).toBeTruthy();
  });
});
