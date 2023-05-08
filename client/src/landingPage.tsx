import * as React from 'react';
import {CSSProperties, ReactNode, useEffect, useState} from 'react';
import {animated, useSpring} from '@react-spring/web';
import BoltIcon from '@mui/icons-material/Bolt';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import DashboardIcon from '@mui/icons-material/Dashboard';
import TuneIcon from '@mui/icons-material/Tune';
import {Tweet} from 'react-twitter-widgets';
import Typography from '@mui/material/Typography';
import {adminPagePath} from '../../shared/constants';
import {useNavigate} from 'react-router-dom';
import {useTheme} from '@mui/material/styles';
import {useTrackVisibility} from 'react-intersection-observer-hook';

export const LandingPage = () => {
  const theme = useTheme();
  const navigate = useNavigate();

  const titleStyles: CSSProperties = {
    marginBottom: theme.spacing(4)
  };

  const subtitleStyles: CSSProperties = {
    marginBottom: theme.spacing(6)
  };

  const featureItemStyles: CSSProperties = {
    alignItems: 'center',
    marginBottom: theme.spacing(4),
    display: 'inline-flex'
  };

  const featureIconStyles: CSSProperties = {
    marginRight: theme.spacing(2)
  };

  return (
    <Box sx={{
      height: '100vh',
      overflow: 'auto',
      background: theme.palette.background.default,
      color: theme.palette.text.primary,
      textAlign: 'center',
      alignItems: 'center',
      justifyContent: 'center',
      scrollSnapType: 'y mandatory'
    }}>
      <LandingPageSection>
        <div style={titleStyles}>
          <Typography variant='h3'>
            LightningVend
          </Typography>
        </div>
        <div style={subtitleStyles}>
          <Typography variant='subtitle1'>
            The Bitcoin Lightning Network solution for vending machines
          </Typography>
        </div>
        <Button variant='contained' color='primary' onClick={() => navigate(adminPagePath)}>
          Get Started
        </Button>
      </LandingPageSection>
      <LandingPageSection>
        <div style={titleStyles}>
          <Typography variant='h4'>
            Features
          </Typography>
        </div>
        <div style={featureItemStyles}>
          <BoltIcon style={featureIconStyles}/>
          <Typography variant='subtitle1'>
            Fast and interoperable payments with Bitcoin Lightning Network
          </Typography>
        </div>
        <div style={featureItemStyles}>
          <TuneIcon style={featureIconStyles}/>
          <Typography variant='subtitle1'>
            Flexible vending machine integration
          </Typography>
        </div>
        <div style={featureItemStyles}>
          <DashboardIcon style={featureIconStyles}/>
          <Typography variant='subtitle1'>
            Comprehensive device and inventory management dashboard
          </Typography>
        </div>
      </LandingPageSection>
      <LandingPageSection style={{maxWidth: '400px', margin: 'auto'}}>
        <div style={titleStyles}>
          <Typography variant='h4'>
            How It Works
          </Typography>
        </div>
        <Typography>
          LightningVend is a software system that allows integration of Lightning Network payments
          into vending machines.
        </Typography>
        <Typography>
          Our software is flexible and supports various form-factors and
          device types such as hand-crank gumball machines, soda/candy vending machines, sticker
          machines, and more.
        </Typography>
        <Typography>
          Devices only need power and an internet connection and use our hosted
          software platform to provide a clean touchscreen user interface to customers.
        </Typography>
        <Typography>
          Payments are
          send to our managed LN node for high-reliability payments. You can withdraw payments to
          any LN-compatible wallet, or setup automatic withdrawal to your own LN node.
        </Typography>
      </LandingPageSection>
      <LandingPageSection>
        <div style={titleStyles}>
          <Typography variant='h4'>
            Demo
          </Typography>
        </div>
        <div style={{textAlign: ('-webkit-center' as any)}}>
          <Tweet tweetId={'1608300837083684865'} options={{style: {margin: 'auto'}}}/>
        </div>
      </LandingPageSection>
    </Box>
  );
};

interface LandingPageSectionProps {
  children: ReactNode | ReactNode[],
  style?: CSSProperties
}

const LandingPageSection = (props: LandingPageSectionProps) => {
  const [shouldShow, setShouldShow] = useState(false);

  const [fullyVisibleRef, {isVisible: isFullyVisible}] = useTrackVisibility({threshold: 0});
  const [halfVisibleRef, {isVisible: isAtLeastHalfVisible}] = useTrackVisibility({threshold: 0.5});

  useEffect(() => {
    if (shouldShow && !isFullyVisible) {
      setShouldShow(false);
    } else if (!shouldShow && isAtLeastHalfVisible) {
      setShouldShow(true);
    }
  }, [isFullyVisible, isAtLeastHalfVisible]);

  return (
    <div style={{height: '100vh', scrollSnapAlign: 'start'}}>
      <div
        style={{
          position: 'relative',
          top: '50%',
          transform: 'translateY(-50%)',
          padding: '20px'
        }}
      >
        <div ref={halfVisibleRef}>
          <div style={props.style} ref={fullyVisibleRef}>
            {[props.children].flat().map((childNode, i) => {
              const styles = useSpring({
                opacity: shouldShow ? 1 : 0,
                x: shouldShow ? 0 : -100,
                delay: i * 100
              });

              return (
                <animated.div style={styles}>
                  {childNode}
                </animated.div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};
