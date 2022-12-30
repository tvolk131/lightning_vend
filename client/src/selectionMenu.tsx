import {CircularProgress, Paper, Typography, Fab, Zoom, Alert} from '@mui/material';
import {Cancel as CancelIcon} from '@mui/icons-material';
import * as React from 'react';
import {CSSProperties, useEffect, useRef, useReducer} from 'react';
import {getInvoice, subscribeToInvoicePaid, unsubscribeFromInvoicePaid} from './deviceApi';
import {Invoice} from './invoice';
import {InventoryItem} from '../../server/deviceSessionManager';

interface SelectionItemProps {
  itemName: string,
  itemPriceSats: number,
  size: number,
  padding: number,
  onClick(): void
}

const SelectionItem = (props: SelectionItemProps) => {
  return (
    <div
      style={{
        padding: `${props.padding}px`,
        width: 'fitContent',
        margin: 'auto',
        float: 'left'
      }}
    >
      <Paper
        elevation={6}
        style={{
          height: `${props.size}px`,
          width: `${props.size}px`,
          cursor: 'pointer'
        }}
        onClick={props.onClick}
      >
        <Typography variant={'h6'} style={{padding: '20px'}}>{props.itemName}</Typography>
        <Typography style={{padding: '20px'}}>{props.itemPriceSats} sats</Typography>
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
    const callbackId = subscribeToInvoicePaid((paidInvoice) => {
      if (paidInvoice === invoiceRef.current) {
        dispatch({type: 'showInvoiceIsPaid'});
        setTimeout(() => dispatch({type: 'hideInvoice'}), 1500);
      }
    });
    return (() => {
      unsubscribeFromInvoicePaid(callbackId);
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
            <Paper style={{height: `${props.size}px`, width: `${props.size}px`, position: 'relative'}}>
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
              <div
                style={{
                  padding: `${spaceBetweenItems}px`,
                  transition: 'opacity 0.25s',
                  opacity: state.loadingInvoice ? '50%' : '100%'
                }}
              >
                {
                  props.inventory.length ?
                    props.inventory.map(({name, priceSats}, index) => (
                      <SelectionItem
                        itemName={name}
                        key={index}
                        itemPriceSats={priceSats}
                        size={(props.size / 2) - (spaceBetweenItems * 3)}
                        padding={spaceBetweenItems}
                        onClick={() => {
                          if (!state.disableItemSelection) {
                            dispatch({type: 'showLoadingInvoice'});
                            getInvoice().then((invoice) => {
                              dispatch({type: 'showInvoice', invoice});
                            }).catch(() => {
                              dispatch({type: 'hideInvoiceAndShowLoadError'});
                            });
                          }
                        }}
                      />
                    ))
                    :
                    <Typography>Inventory is empty! If you are the owner of this machine, head over to the admin page to add some items here.</Typography>
                }
              </div>
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
          <div style={{position: 'absolute', paddingTop: '20px', width: 'max-content', left: '50%', transform: 'translateX(-50%)'}}>
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
            transition: `padding ${transitionTimeSecs}s`,
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