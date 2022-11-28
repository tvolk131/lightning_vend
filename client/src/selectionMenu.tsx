import {CircularProgress, Paper, Typography} from '@mui/material';
import * as React from 'react';
import {CSSProperties, useEffect, useRef, useState} from 'react';
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

export const SelectionMenu = (props: SelectionMenuProps) => {
  const [loadingInvoice, setLoadingInvoice] = useState(false);
  const [invoice, setInvoice] = useState<string>();
  const [invoiceIsPaid, setInvoiceIsPaid] = useState(false);

  const invoiceRef = useRef<string>();

  useEffect(() => {
    invoiceRef.current = invoice;
  }, [invoice]);

  useEffect(() => {
    onInvoicePaid((paidInvoice) => {
      if (paidInvoice === invoiceRef.current) {
        setInvoiceIsPaid(true);
        setTimeout(() => setInvoice(undefined), 1000);
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

  const disableSelection = loadingInvoice || !!invoice;

  return (
    <div style={{padding: '10px'}}>
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
            transition: 'transform 1s',
            transformStyle: 'preserve-3d',
            transform: invoice ? 'rotateY(180deg)' : ''
          }}
        >
          <div
            style={innerSideStyles}
          >
            <Paper style={{height: `${props.size}px`, width: `${props.size}px`, position: 'relative'}}>
              {
                loadingInvoice &&
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
                  opacity: disableSelection ? '50%' : '100%'
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
                        if (!disableSelection) {}
                        setLoadingInvoice(true);
                        setInvoiceIsPaid(false);
                        getInvoice().then((invoice) => {
                          setInvoice(invoice);
                          setLoadingInvoice(false);
                        });
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
                invoice={invoice || ''}
                invoiceIsPaid={invoiceIsPaid}
              />
            </Paper>
          </div>
        </div>
      </div>
    </div>
  );
};