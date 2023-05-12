import * as React from 'react';
import {CSSProperties, useEffect, useReducer, useRef} from 'react';
import Alert from '@mui/material/Alert';
import CancelIcon from '@mui/icons-material/Cancel';
import CircularProgress from '@mui/material/CircularProgress';
import Dialog from '@mui/material/Dialog';
import Fab from '@mui/material/Fab';
import {InventoryItem} from '../../proto/lightning_vend/model';
import {Invoice} from './invoice';
import Paper from '@mui/material/Paper';
import Slide from '@mui/material/Slide';
import {TransitionProps} from '@mui/material/transitions';
import Typography from '@mui/material/Typography';
import Zoom from '@mui/material/Zoom';
import axios from 'axios';
import {deviceApi} from './api/deviceApi';

// TODO - Store this in LocalStorage so that reloading the page doesn't break existing invoices.
const invoiceToExecutionCommand: {[invoice: string]: string} = {};

interface SelectionItemProps {
  inventoryItem: InventoryItem,
  size: number,
  isOnlySelectionItem?: boolean,
  padding: number,
  onClick(): void
}

const SlideDownTransition = React.forwardRef(function Transition(
  props: TransitionProps & {
    children: React.ReactElement<any, any>;
  },
  ref: React.Ref<unknown>
) {
  return <Slide direction={'down'} ref={ref} {...props} />;
});

const SelectionItem = (props: SelectionItemProps) => {
  return (
    <div
      style={{
        padding: `${props.padding}px`,
        width: 'fitContent',
        textAlign: 'center',
        float: 'left'
      }}
    >
      <Paper
        elevation={props.isOnlySelectionItem ? undefined : 6}
        style={{
          height: `${props.size}px`,
          width: `${props.size}px`,
          cursor: 'pointer'
        }}
        onClick={props.onClick}
      >
        <Typography
          variant={props.isOnlySelectionItem ? 'h3' : 'h6'}
          style={{padding: props.isOnlySelectionItem ? '60px' : '20px'}}
        >
          {props.inventoryItem.displayName}
        </Typography>
        <Typography
          variant={props.isOnlySelectionItem ? 'h5' : undefined}
          style={{padding: '20px'}}
        >
          {props.inventoryItem.priceSats} sats
        </Typography>
      </Paper>
    </div>
  );
};

interface SelectionMenuProps {
  size: number,
  canShowInvoice: boolean,
  inventory: InventoryItem[]
}

interface SelectionMenuState {
  invoice: string,
  loadingInvoice: boolean,
  showInvoice: boolean,
  showInvoicePaidConfirmation: boolean,
  disableItemSelection: boolean,
  showInvoiceLoadError: boolean
}

type SelectionMenuAction =
 | {type: 'showLoadingInvoice'}
 | {type: 'showInvoice', invoice: string}
 | {type: 'showInvoiceIsPaid'}
 | {type: 'hideInvoiceAndShowLoadError'}
 | {type: 'hideInvoice'};

export const SelectionMenu = (props: SelectionMenuProps) => {
  const [state, dispatch] = useReducer(
    (state: SelectionMenuState, action: SelectionMenuAction) => {
      switch (action.type) {
        case 'showLoadingInvoice':
          return {
            invoice: state.invoice,
            loadingInvoice: true,
            showInvoice: false,
            showInvoicePaidConfirmation: false,
            disableItemSelection: true,
            showInvoiceLoadError: false
          };
        case 'showInvoice':
          return {
            invoice: action.invoice,
            loadingInvoice: false,
            showInvoice: true,
            showInvoicePaidConfirmation: false,
            disableItemSelection: true,
            showInvoiceLoadError: false
          };
        case 'showInvoiceIsPaid':
          return {
            invoice: state.invoice,
            loadingInvoice: false,
            showInvoice: true,
            showInvoicePaidConfirmation: true,
            disableItemSelection: true,
            showInvoiceLoadError: false
          };
        case 'hideInvoiceAndShowLoadError':
          return {
            invoice: state.invoice,
            loadingInvoice: false,
            showInvoice: false,
            showInvoicePaidConfirmation: state.showInvoicePaidConfirmation,
            disableItemSelection: false,
            showInvoiceLoadError: true
          };
        case 'hideInvoice':
          return {
            invoice: state.invoice,
            loadingInvoice: false,
            showInvoice: false,
            showInvoicePaidConfirmation: state.showInvoicePaidConfirmation,
            disableItemSelection: false,
            showInvoiceLoadError: false
          };
      }
    },
    {
      invoice: '',
      loadingInvoice: false,
      showInvoice: false,
      showInvoicePaidConfirmation: false,
      disableItemSelection: false,
      showInvoiceLoadError: false
    }
  );

  const invoiceRef = useRef<string>();

  useEffect(() => {
    invoiceRef.current = state.invoice;
  }, [state.invoice]);

  useEffect(() => {
    if (!props.canShowInvoice && state.showInvoice) {
      dispatch({type: 'hideInvoice'});
    }
  }, [props.canShowInvoice, state]);

  useEffect(() => {
    const callbackId = deviceApi.subscribeToInvoicePaid((paidInvoice) => {
      const command = invoiceToExecutionCommand[paidInvoice];
      if (command) {
        // TODO - Handle any potential error from the webhook.
        axios.get(`http://localhost:21000/commands/${command}`);
      }
      dispatch({type: 'showInvoiceIsPaid'});
      setTimeout(() => dispatch({type: 'hideInvoice'}), 1500);
    });
    return (() => {
      deviceApi.unsubscribeFromInvoicePaid(callbackId);
    });
  }, []);

  const innerSideStyles: CSSProperties = {
    position: 'absolute',
    height: '100%',
    width: '100%',
    WebkitBackfaceVisibility: 'hidden',
    backfaceVisibility: 'hidden'
  };

  const spaceBetweenItems = 10;
  const loadingSpinnerSize = 100;
  const showCancelButton = state.showInvoice && !state.showInvoicePaidConfirmation;
  const transitionTimeSecs = 0.65;

  if (props.inventory.length === 0) {
    return (
      <Paper style={{height: `${props.size}px`, width: `${props.size}px`, position: 'relative'}}>
        <div
          style={{
            padding: '20px',
            textAlign: 'center',
            position: 'absolute',
            top: '50%',
            transform: 'translateY(-50%)'
          }}
        >
          <Typography variant={'h5'}>Inventory is empty!</Typography>
          <Typography>
            If you are the owner of this machine, head over to the admin page to add some items.
          </Typography>
        </div>
      </Paper>
    );
  }

  const createItemClickHandler = (inventoryItem: InventoryItem) => {
    return () => {
      if (!state.disableItemSelection) {
        dispatch({type: 'showLoadingInvoice'});
        deviceApi.createInvoice(inventoryItem.priceSats).then((invoice) => {
          invoiceToExecutionCommand[invoice] = inventoryItem.executionCommand;
          dispatch({type: 'showInvoice', invoice});
        }).catch(() => {
          dispatch({type: 'hideInvoiceAndShowLoadError'});
        });
      }
    };
  };

  const inventoryComponents = props.inventory.map((inventoryItem, index) => (
    <SelectionItem
      key={index}
      inventoryItem={inventoryItem}
      size={(props.size / 2) - (spaceBetweenItems * 3)}
      padding={spaceBetweenItems}
      onClick={createItemClickHandler(inventoryItem)}
    />
  ));

  if (props.inventory.length > 4) {
    // TODO - This branch doesn't use `state.showInvoiceLoadError`.
    // Make sure it displays a proper error message!
    return (
      <div
        style={{
          padding: `${spaceBetweenItems}px`,
          display: 'flex',
          flexWrap: 'wrap',
          justifyContent: 'center'
        }}
      >
        <Dialog
          open={state.loadingInvoice || state.showInvoice}
          PaperComponent={
            state.loadingInvoice ?
              () => (<CircularProgress size={loadingSpinnerSize}/>)
              :
              Paper
          }
          TransitionComponent={state.loadingInvoice ? undefined : SlideDownTransition}
          transitionDuration={state.loadingInvoice ? undefined : 500}
          onClose={() => {
            dispatch({type: 'hideInvoice'});
          }}
        >
          <Invoice
            size={props.size}
            invoice={state.invoice}
            invoiceIsPaid={state.showInvoicePaidConfirmation}
          />
        </Dialog>
        {inventoryComponents}
      </div>
    );
  }

  const getInventoryItems = () => {
    if (props.inventory.length === 1) {
      const inventoryItem = props.inventory[0];

      return (
        <SelectionItem
          inventoryItem={inventoryItem}
          isOnlySelectionItem
          size={props.size}
          padding={0}
          onClick={createItemClickHandler(inventoryItem)}
        />
      );
    } else {
      return (
        <div
          style={{
            padding: `${spaceBetweenItems}px`,
            transition: 'opacity 0.25s',
            opacity: state.loadingInvoice ? '50%' : '100%'
          }}
        >
          {inventoryComponents}
        </div>
      );
    }
  };

  return (
    <div
      style={{
        padding: '10px',
        transition: `transform ${transitionTimeSecs}s`,
        transform: showCancelButton ? 'translate(0, -35px)' : undefined
      }}
    >
      <div
        style={{
          height: `${props.size}px`,
          width: `${props.size}px`,
          perspective: '1000px'
        }}
      >
        <div
          style={{
            position: 'relative',
            height: '100%',
            width: '100%',
            textAlign: 'center',
            transition: `transform ${transitionTimeSecs}s`,
            transformStyle: 'preserve-3d',
            transform: state.showInvoice ? 'rotateY(180deg)' : ''
          }}
        >
          <div
            style={innerSideStyles}
          >
            <Paper
              style={{
                height: `${props.size}px`,
                width: `${props.size}px`,
                position: 'relative'
              }}
            >
              {
                state.loadingInvoice &&
                  <CircularProgress
                    size={loadingSpinnerSize}
                    style={{
                      position: 'absolute',
                      top: 0,
                      left: 0,
                      margin: `${(props.size - loadingSpinnerSize) / 2}px`,
                      zIndex: 1000
                    }}
                  />
              }
              {getInventoryItems()}
            </Paper>
          </div>
          <div
            style={{
              ...innerSideStyles,
              transform: 'rotateY(180deg)'
            }}
          >
            <Paper style={{height: `${props.size}px`, width: `${props.size}px`}}>
              <Invoice
                size={props.size}
                invoice={state.invoice}
                invoiceIsPaid={state.showInvoicePaidConfirmation}
              />
            </Paper>
          </div>
        </div>
      </div>
      {state.showInvoiceLoadError && (
        <div style={{position: 'relative'}}>
          <div
            style={{
              position: 'absolute',
              paddingTop: '20px',
              width: 'max-content',
              left: '50%',
              transform: 'translateX(-50%)'
            }}
          >
            <Alert severity={'error'}>Failed to fetch an invoice! Try again.</Alert>
          </div>
        </div>
      )}
      <div style={{position: 'relative'}}>
        <div
          style={{
            position: 'absolute',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%)',
            padding: `${showCancelButton ? 20 : 0}px`,
            transition: `padding ${transitionTimeSecs}s`
        }}
        >
          <Zoom timeout={transitionTimeSecs * 1000} in={showCancelButton} unmountOnExit>
            <Fab
              variant={'extended'}
              color={'primary'}
              style={{display: 'flex', margin: 'auto'}}
              onClick={() => dispatch({type: 'hideInvoice'})}
            >
              <CancelIcon sx={{mr: 1}} />
              Cancel
            </Fab>
          </Zoom>
        </div>
      </div>
    </div>
  );
};