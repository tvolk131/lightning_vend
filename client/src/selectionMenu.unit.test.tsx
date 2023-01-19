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
          displayName: 'Test Item 1',
          priceSats: 1234,
          executionWebhook: 'http://localhost:3000/actions/1'
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
          displayName: 'Test Item 1',
          priceSats: 1000,
          executionWebhook: 'http://localhost:3000/actions/1'
        },
        {
          displayName: 'Test Item 2',
          priceSats: 2000,
          executionWebhook: 'http://localhost:3000/actions/2'
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
          displayName: 'Test Item 1',
          priceSats: 1000,
          executionWebhook: 'http://localhost:3000/actions/1'
        },
        {
          displayName: 'Test Item 2',
          priceSats: 2000,
          executionWebhook: 'http://localhost:3000/actions/2'
        },
        {
          displayName: 'Test Item 3',
          priceSats: 3000,
          executionWebhook: 'http://localhost:3000/actions/3'
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
          displayName: 'Test Item 1',
          priceSats: 1000,
          executionWebhook: 'http://localhost:3000/actions/1'
        },
        {
          displayName: 'Test Item 2',
          priceSats: 2000,
          executionWebhook: 'http://localhost:3000/actions/2'
        },
        {
          displayName: 'Test Item 3',
          priceSats: 3000,
          executionWebhook: 'http://localhost:3000/actions/3'
        },
        {
          displayName: 'Test Item 4',
          priceSats: 4000,
          executionWebhook: 'http://localhost:3000/actions/4'
        }
      ]}
    />
  ).toJSON();
  expect(tree).toMatchSnapshot();
});

it('renders inventory with 5 items', () => {
  const tree = renderer.create(
    <SelectionMenu
      size={330}
      canShowInvoice={true}
      inventory={[
        {
          displayName: 'Test Item 1',
          priceSats: 1000,
          executionWebhook: 'http://localhost:3000/actions/1'
        },
        {
          displayName: 'Test Item 2',
          priceSats: 2000,
          executionWebhook: 'http://localhost:3000/actions/2'
        },
        {
          displayName: 'Test Item 3',
          priceSats: 3000,
          executionWebhook: 'http://localhost:3000/actions/3'
        },
        {
          displayName: 'Test Item 4',
          priceSats: 4000,
          executionWebhook: 'http://localhost:3000/actions/4'
        },
        {
          displayName: 'Test Item 5',
          priceSats: 5000,
          executionWebhook: 'http://localhost:3000/actions/5'
        }
      ]}
    />
  ).toJSON();
  expect(tree).toMatchSnapshot();
});