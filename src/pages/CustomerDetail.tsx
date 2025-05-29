import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Container,
  Typography,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Box,
} from '@mui/material';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import { collection, getDocs, addDoc, doc, getDoc } from 'firebase/firestore';
import { db, auth } from '../config/firebase';

interface UsageEntry {
  id: string;
  date: Date;
  duration: {
    hours: number;
    minutes: number;
  };
  cost: number;
}

interface Customer {
  id: string;
  name: string;
  phone?: string;
  address?: string;
}

export default function CustomerDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [customer, setCustomer] = useState<Customer | null>(null);
  const [entries, setEntries] = useState<UsageEntry[]>([]);
  const [openDialog, setOpenDialog] = useState(false);
  const [formData, setFormData] = useState({
    date: new Date(),
    hours: 0,
    minutes: 0,
    cost: 0,
  });

  useEffect(() => {
    fetchCustomerAndEntries();
  }, [id]);

  const fetchCustomerAndEntries = async () => {
    try {
      const userId = auth.currentUser?.uid;
      if (!userId || !id) return;

      // Fetch customer details
      const customerDoc = await getDoc(doc(db, 'users', userId, 'customers', id));
      if (customerDoc.exists()) {
        setCustomer({ id: customerDoc.id, ...customerDoc.data() } as Customer);
      }

      // Fetch usage entries
      const entriesRef = collection(db, 'users', userId, 'customers', id, 'entries');
      const snapshot = await getDocs(entriesRef);
      const entriesList = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        date: doc.data().date.toDate(),
      } as UsageEntry));
      setEntries(entriesList);
    } catch (error) {
      console.error('Error fetching data:', error);
    }
  };

  const handleAddEntry = () => {
    setFormData({
      date: new Date(),
      hours: 0,
      minutes: 0,
      cost: 0,
    });
    setOpenDialog(true);
  };

  const handleSaveEntry = async () => {
    try {
      const userId = auth.currentUser?.uid;
      if (!userId || !id) return;

      const entryData = {
        date: formData.date,
        duration: {
          hours: formData.hours,
          minutes: formData.minutes,
        },
        cost: formData.cost,
      };

      await addDoc(collection(db, 'users', userId, 'customers', id, 'entries'), entryData);
      setOpenDialog(false);
      await fetchCustomerAndEntries();
    } catch (error) {
      console.error('Error saving entry:', error);
    }
  };

  const calculateTotalCost = () => {
    return entries.reduce((total, entry) => total + entry.cost, 0);
  };

  if (!customer) {
    return <Typography>Loading...</Typography>;
  }

  return (
    <Container maxWidth="md" sx={{ mt: 4 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 3 }}>
        <Typography variant="h4" component="h1">
          {customer.name}
        </Typography>
        <Button
          variant="contained"
          onClick={handleAddEntry}
        >
          Add Usage Entry
        </Button>
      </Box>

      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>Date</TableCell>
              <TableCell>Duration</TableCell>
              <TableCell align="right">Cost (₹)</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {entries.map((entry) => (
              <TableRow key={entry.id}>
                <TableCell>{entry.date.toLocaleDateString()}</TableCell>
                <TableCell>
                  {entry.duration.hours}h {entry.duration.minutes}m
                </TableCell>
                <TableCell align="right">{entry.cost}</TableCell>
              </TableRow>
            ))}
            <TableRow>
              <TableCell colSpan={2}>
                <Typography variant="subtitle1">Total Cost</Typography>
              </TableCell>
              <TableCell align="right">
                <Typography variant="subtitle1">₹{calculateTotalCost()}</Typography>
              </TableCell>
            </TableRow>
          </TableBody>
        </Table>
      </TableContainer>

      <Dialog open={openDialog} onClose={() => setOpenDialog(false)}>
        <DialogTitle>Add Usage Entry</DialogTitle>
        <DialogContent>
          <LocalizationProvider dateAdapter={AdapterDateFns}>
            <DatePicker
              label="Date"
              value={formData.date}
              onChange={(newValue) => {
                if (newValue) {
                  setFormData({ ...formData, date: newValue });
                }
              }}
              sx={{ mt: 2, mb: 2 }}
            />
          </LocalizationProvider>
          <TextField
            margin="dense"
            label="Hours"
            type="number"
            fullWidth
            value={formData.hours}
            onChange={(e) => setFormData({ ...formData, hours: parseInt(e.target.value) || 0 })}
          />
          <TextField
            margin="dense"
            label="Minutes"
            type="number"
            fullWidth
            value={formData.minutes}
            onChange={(e) => setFormData({ ...formData, minutes: parseInt(e.target.value) || 0 })}
          />
          <TextField
            margin="dense"
            label="Cost (₹)"
            type="number"
            fullWidth
            value={formData.cost}
            onChange={(e) => setFormData({ ...formData, cost: parseFloat(e.target.value) || 0 })}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenDialog(false)}>Cancel</Button>
          <Button onClick={handleSaveEntry} variant="contained">
            Save
          </Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
} 