import {CircularProgress, Paper, Typography, Fab, Zoom} from '@mui/material';
import {Cancel as CancelIcon} from '@mui/icons-material';
import * as React from 'react';
import {CSSProperties, useEffect, useRef, useReducer} from 'react';
import {getInvoice, onInvoicePaid} from './api';
import {Invoice} from './invoice';

interface SelectionItemProps {
  itemName: string,
  itemCostSats: number,
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
        <Typography style={{padding: '20px'}}>{props.itemCostSats} sats</Typography>
      </Paper>
    </div>
  );
};

interface SelectionMenuProps {
  size: number
}

interface SelectionMenuState {
  invoice: string,
  loadingInvoice: boolean,
  showInvoice: boolean,
  showInvoicePaidConfirmation: boolean,
  disableItemSelection: boolean
}

type SelectionMenuAction =
 | {type: 'showLoadingInvoice'}
 | {type: 'showInvoice', invoice: string}
 | {type: 'showInvoiceIsPaid'}
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
            disableItemSelection: true
          };
        case 'showInvoice':
          return {
            invoice: action.invoice,
            loadingInvoice: false,
            showInvoice: true,
            showInvoicePaidConfirmation: false,
            disableItemSelection: true
          };
        case 'showInvoiceIsPaid':
          return {
            invoice: state.invoice,
            loadingInvoice: false,
            showInvoice: true,
            showInvoicePaidConfirmation: true,
            disableItemSelection: true
          };
        case 'hideInvoice':
          return {
            invoice: state.invoice,
            loadingInvoice: false,
            showInvoice: false,
            showInvoicePaidConfirmation: state.showInvoicePaidConfirmation,
            disableItemSelection: false
          };
      }
    },
    {
      invoice: '',
      loadingInvoice: false,
      showInvoice: false,
      showInvoicePaidConfirmation: false,
      disableItemSelection: false
    }
  );

  const invoiceRef = useRef<string>();

  useEffect(() => {
    invoiceRef.current = state.invoice;
  }, [state.invoice]);

  useEffect(() => {
    onInvoicePaid((paidInvoice) => {
      if (paidInvoice === invoiceRef.current) {
        dispatch({type: 'showInvoiceIsPaid'});
        setTimeout(() => dispatch({type: 'hideInvoice'}), 1500);
      }
    });
    // return () => unlistener(); TODO - Deal with listener cleanup on component unmount.
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

  // TODO - Load inventory from Tauri backend.
  const inventory = [
    {
      name: 'Cheez-Its',
      costSats: 5
    },
    {
      name: 'Carmello',
      costSats: 10
    },
    {
      name: 'Gushers',
      costSats: 15
    }
  ];

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
                  inventory.map(({name, costSats}) => (
                    <SelectionItem
                      itemName={name}
                      itemCostSats={costSats}
                      size={(props.size / 2) - (spaceBetweenItems * 3)}
                      padding={spaceBetweenItems}
                      onClick={() => {
                        if (!state.disableItemSelection) {
                          dispatch({type: 'showLoadingInvoice'});
                          getInvoice().then((invoice) => {
                            dispatch({type: 'showInvoice', invoice});
                          });
                        }
                      }}
                    />
                  ))
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