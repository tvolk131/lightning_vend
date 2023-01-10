import * as renderer from 'react-test-renderer';
import * as React from 'react';
import {SelectionMenu} from './selectionMenu';

it('renders empty inventory', () => {
  const tree = renderer.create(
    <SelectionMenu
      size={330}
      canShowInvoice={true}
      inventory={[]}
    />
  ).toJSON();
  expect(tree).toMatchSnapshot();
});

it('renders inventory with 1 item', () => {
  const tree = renderer.create(
    <SelectionMenu
      size={330}
      canShowInvoice={true}
      inventory={[
        {
          name: 'Test Item 1',
          priceSats: 1234
        }
      ]}
    />
  ).toJSON();
  expect(tree).toMatchSnapshot();
});

it('renders inventory with 2 items', () => {
  const tree = renderer.create(
    <SelectionMenu
      size={330}
      canShowInvoice={true}
      inventory={[
        {
          name: 'Test Item 1',
          priceSats: 1000
        },
        {
          name: 'Test Item 2',
          priceSats: 2000
        }
      ]}
    />
  ).toJSON();
  expect(tree).toMatchSnapshot();
});

it('renders inventory with 3 items', () => {
  const tree = renderer.create(
    <SelectionMenu
      size={330}
      canShowInvoice={true}
      inventory={[
        {
          name: 'Test Item 1',
          priceSats: 1000
        },
        {
          name: 'Test Item 2',
          priceSats: 2000
        },
        {
          name: 'Test Item 3',
          priceSats: 3000
        }
      ]}
    />
  ).toJSON();
  expect(tree).toMatchSnapshot();
});

it('renders inventory with 4 items', () => {
  const tree = renderer.create(
    <SelectionMenu
      size={330}
      canShowInvoice={true}
      inventory={[
        {
          name: 'Test Item 1',
          priceSats: 1000
        },
        {
          name: 'Test Item 2',
          priceSats: 2000
        },
        {
          name: 'Test Item 3',
          priceSats: 3000
        },
        {
          name: 'Test Item 4',
          priceSats: 4000
        }
      ]}
    />
  ).toJSON();
  expect(tree).toMatchSnapshot();
});