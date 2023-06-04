import * as React from 'react';
import Accordion from '@mui/material/Accordion';
import AccordionDetails from '@mui/material/AccordionDetails';
import AccordionSummary from '@mui/material/AccordionSummary';
import Button from '@mui/material/Button';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import List from '@mui/material/List';
import ListItem from '@mui/material/ListItem';
import ListItemText from '@mui/material/ListItemText';
import Typography from '@mui/material/Typography';
import {adminPagePath} from '../../shared/constants';
import {useNavigate} from 'react-router-dom';

export const LearnMorePage = () => {
  const navigate = useNavigate();

  return (
    <div
      style={{
        textAlign: 'center',
        maxWidth: '500px',
        margin: 'auto',
        padding: '20px'
      }}
    >
      <Typography variant='h4' style={{paddingBottom: '20px'}}>
        About LightningVend
      </Typography>
      <Accordion>
        <AccordionSummary expandIcon={<ExpandMoreIcon/>}>
          <Typography>Introduction to LightningVend</Typography>
        </AccordionSummary>
        <AccordionDetails>
          <Typography>
            LightningVend is a versatile software system designed to seamlessly
            integrate Lightning Network payments into vending machines. Our
            software is highly adaptable, supporting various form-factors and
            device types, including hand-crank gumball machines, soda/candy
            vending machines, sticker machines, and more. To operate, devices
            simply require a power source and an internet connection. Our hosted
            software platform provides a user-friendly touchscreen interface to
            customers. Payments are securely sent to our managed LN node,
            ensuring reliable transaction processing.
          </Typography>
        </AccordionDetails>
      </Accordion>
      <Accordion>
        <AccordionSummary expandIcon={<ExpandMoreIcon/>}>
          <Typography>Self-Custody and Withdrawals (Coming Soon)</Typography>
        </AccordionSummary>
        <AccordionDetails>
          <Typography>
            Although we receive all payments to our managed Lightning Node (more
            about that in the section below) we strongly encourage self-custody
            and provide tools to assist you in this process. You have the
            freedom to perform manual withdrawals on-chain or through the
            Lightning Network at any time. This gives you full control over your
            funds and allows you to manage your own wallet independently.
          </Typography>
        </AccordionDetails>
      </Accordion>
      <Accordion>
        <AccordionSummary expandIcon={<ExpandMoreIcon/>}>
          <Typography>Benefits of Utilizing our Managed Node</Typography>
        </AccordionSummary>
        <AccordionDetails>
          <Typography>
            Connecting and managing your own Lightning node can be challenging,
            requiring technical expertise and continuous maintenance. By
            utilizing our managed node, you can enjoy the following benefits:
          </Typography>
          <List>
            <ListItem>
              <ListItemText>
                Ease of Use: Our software simplifies the setup process and
                provides a user-friendly experience, making it accessible to a
                wide range of users.
              </ListItemText>
            </ListItem>
            <ListItem>
              <ListItemText>
                High Uptime: Our managed node ensures reliable operation and
                minimizes potential downtime, guaranteeing smooth payment
                processing.
              </ListItemText>
            </ListItem>
            <ListItem>
              <ListItemText>
                Hosting Fee Structure: By utilizing our managed node, we offer a
                hosting fee structure that covers the cost of maintaining the
                infrastructure, allowing you to focus on your vending machine
                business.
              </ListItemText>
            </ListItem>
            <ListItem>
              <ListItemText>
                Advanced Features: Our managed node enables us to provide
                advanced features like payment splitting, which enhances your
                payment management capabilities.
              </ListItemText>
            </ListItem>
          </List>
        </AccordionDetails>
      </Accordion>
      <Accordion>
        <AccordionSummary expandIcon={<ExpandMoreIcon/>}>
          <Typography>Payment Splitting (Coming Soon)</Typography>
        </AccordionSummary>
        <AccordionDetails>
          <Typography>
            With our payment splitting feature, you can easily distribute
            incoming payments among multiple accounts, facilitating the
            allocation of funds to multiple parties. This enables efficient and
            seamless distribution of funds, allowing you to manage payments to
            different entities or stakeholders according to your needs.
          </Typography>
        </AccordionDetails>
      </Accordion>
      <Accordion>
        <AccordionSummary expandIcon={<ExpandMoreIcon/>}>
          <Typography>Automatic Withdrawals (Coming Soon)</Typography>
        </AccordionSummary>
        <AccordionDetails>
          <Typography>
            In addition to manual withdrawals, our system supports automatic
            withdrawals to any Lightning node that supports Atomic Multipart
            Payments. This feature streamlines the withdrawal process, enabling
            you to set up automated transfers of funds to your preferred
            Lightning node. By leveraging this capability, you can ensure
            convenient and timely access to your funds without the need for
            manual intervention.
          </Typography>
        </AccordionDetails>
      </Accordion>
      <Button
        variant='contained'
        color='primary'
        style={{marginTop: '20px'}}
        onClick={() => navigate(adminPagePath)}
      >
        Get Started
      </Button>
    </div>
  );
};
