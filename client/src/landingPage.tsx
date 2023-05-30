import * as React from 'react';
import {CSSProperties, ReactNode, useEffect, useRef, useState} from 'react';
import {adminPagePath, learnMorePagePath} from '../../shared/constants';
import {animated, useSpring} from '@react-spring/web';
import ArrowDownwardIcon from '@mui/icons-material/ArrowDownward';
import BoltIcon from '@mui/icons-material/Bolt';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import DashboardIcon from '@mui/icons-material/Dashboard';
import GitHubIcon from '@mui/icons-material/GitHub';
import IconButton from '@mui/material/IconButton';
import TuneIcon from '@mui/icons-material/Tune';
import {Tweet} from 'react-twitter-widgets';
import Typography from '@mui/material/Typography';
import {useNavigate} from 'react-router-dom';
import {useTheme} from '@mui/material/styles';
import {useTrackVisibility} from 'react-intersection-observer-hook';

const totalSlideAnimationTimeMs = 300;

export const LandingPage = () => {
  const theme = useTheme();
  const navigate = useNavigate();

  const scrollRef = useRef<HTMLDivElement>(null);

  const subtitleStyles: CSSProperties = {
    marginBottom: theme.spacing(4)
  };

  return (
    <Box
      sx={{
        height: '100vh',
        overflow: 'auto',
        textAlign: 'center',
        alignItems: 'center',
        justifyContent: 'center',
        scrollSnapType: 'y mandatory'
      }}
      ref={scrollRef}
    >
      <LandingPageSection headerText={'LightningVend'} bigHeader>
        <div style={subtitleStyles}>
          <Typography variant='subtitle1'>
            The Bitcoin solution for vending machines
          </Typography>
        </div>
        <Button variant='contained' color='primary' onClick={() => navigate(adminPagePath)}>
          Get Started
        </Button>
        <IconButton
          style={{
            marginTop: theme.spacing(4)
          }}
          color={'primary'}
          onClick={() => scrollRef.current?.scrollBy({
            top: window.innerHeight / 10,
            behavior: 'smooth'
          })}
        >
          <ArrowDownwardIcon/>
        </IconButton>
      </LandingPageSection>
      <LandingPageSection headerText={'Features'}>
        <LandingPageText icon={BoltIcon} verticalSpacing={0}>
          Fast and interoperable payments with Bitcoin Lightning Network
        </LandingPageText>
        <LandingPageText icon={TuneIcon}>
          Flexible vending machine integration
        </LandingPageText>
        <LandingPageText icon={DashboardIcon}>
          Comprehensive device and inventory management dashboard (coming soon)
        </LandingPageText>
        <Button
          style={{
            marginTop: theme.spacing(4)
          }}
          variant='contained'
          color='primary'
          onClick={() => navigate(learnMorePagePath)}
        >
          Learn More
        </Button>
      </LandingPageSection>
      <LandingPageSection headerText={'Demo'}>
        <div style={{textAlign: ('-webkit-center' as any)}}>
          <Tweet tweetId={'1608300837083684865'} options={{style: {margin: 'auto'}}}/>
        </div>
      </LandingPageSection>
      <LandingPageSection headerText={'Links'}>
        <LandingPageText verticalSpacing={0}>
          View the source code on GitHub (it's 100% open source)
        </LandingPageText>
        <IconButton
          onClick={
            () => window.open('https://github.com/tvolk131/lightning_vend', '_blank')?.focus()
          }
        >
          <GitHubIcon/>
        </IconButton>
      </LandingPageSection>
    </Box>
  );
};

interface LandingPageSectionProps {
  children: ReactNode | ReactNode[],
  style?: CSSProperties,
  headerText: string,
  bigHeader?: boolean
}

const LandingPageSection = (props: LandingPageSectionProps) => {
  const [shouldShow, setShouldShow] = useState(false);

  const [fullyVisibleRef, {isVisible: isAtAllVisible}] = useTrackVisibility({threshold: 0});
  const [halfVisibleRef, {isVisible: isAtLeastHalfVisible}] = useTrackVisibility({threshold: 0.5});

  useEffect(() => {
    if (shouldShow && !isAtAllVisible) {
      setShouldShow(false);
    } else if (!shouldShow && isAtLeastHalfVisible) {
      setShouldShow(true);
    }
  }, [isAtAllVisible, isAtLeastHalfVisible]);

  const theme = useTheme();

  const titleStyles: CSSProperties = {
    marginTop: theme.spacing(4),
    marginBottom: theme.spacing(4)
  };

  const headerNode = (
    <div style={titleStyles}>
      <Typography variant={props.bigHeader ? 'h3' : 'h4'}>
        {props.headerText}
      </Typography>
    </div>
  );

  return (
    <div style={{height: '100vh', scrollSnapAlign: 'start'}}>
      <div
        style={{
          position: 'relative',
          top: '50%',
          transform: 'translateY(-50%)',
          padding: '0 20px'
        }}
      >
        <div ref={halfVisibleRef}>
          <div style={props.style} ref={fullyVisibleRef}>
            {[headerNode, props.children].flat().map((childNode, i) => {
              const styles = useSpring({
                opacity: shouldShow ? 1 : 0,
                x: shouldShow ? 0 : -100,
                delay: i * (totalSlideAnimationTimeMs / [props.children].flat().length)
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

interface LandingPageTextProps {
  children: string,
  icon?: React.ElementType
  verticalSpacing?: number
}

const LandingPageText = (props: LandingPageTextProps) => {
  const theme = useTheme();

  const rootStyles: CSSProperties = {
    alignItems: 'center',
    marginTop: theme.spacing(props.verticalSpacing === undefined ? 4 : props.verticalSpacing),
    display: 'inline-flex'
  };

  const iconStyles: CSSProperties = {
    marginRight: theme.spacing(2)
  };

  return (
    <div style={rootStyles}>
      {props.icon && <props.icon style={iconStyles}/>}
      <Typography variant='subtitle1'>
        {props.children}
      </Typography>
    </div>
  );
};
