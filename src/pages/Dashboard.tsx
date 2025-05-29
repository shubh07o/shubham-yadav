import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Container,
  Typography,
  Button,
  List,
  ListItem,
  ListItemText,
  ListItemSecondaryAction,
  IconButton,
  Paper,
  Box,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import DeleteIcon from '@mui/icons-material/Delete';
import EditIcon from '@mui/icons-material/Edit';
import LogoutIcon from '@mui/icons-material/Logout';
import { collection, getDocs, addDoc, deleteDoc, doc, updateDoc } from 'firebase/firestore';
import { db, auth } from '../config/firebase';
import { signOut } from 'firebase/auth';

interface Customer {
  id: string;
  name: string;
  phone?: string;
  address?: string;
}

export default function Dashboard() {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [openDialog, setOpenDialog] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    address: '',
  });
  const navigate = useNavigate();

  useEffect(() => {
    fetchCustomers();
  }, []);

  const fetchCustomers = async () => {
    try {
      const userId = auth.currentUser?.uid;
      if (!userId) return;

      const customersRef = collection(db, 'users', userId, 'customers');
      const snapshot = await getDocs(customersRef);
      const customersList = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      } as Customer));
      setCustomers(customersList);
    } catch (error) {
      console.error('Error fetching customers:', error);
    }
  };

  const handleAddCustomer = () => {
    setEditingCustomer(null);
    setFormData({ name: '', phone: '', address: '' });
    setOpenDialog(true);
  };

  const handleEditCustomer = (customer: Customer) => {
    setEditingCustomer(customer);
    setFormData({
      name: customer.name,
      phone: customer.phone || '',
      address: customer.address || '',
    });
    setOpenDialog(true);
  };

  const handleDeleteCustomer = async (id: string) => {
    try {
      const userId = auth.currentUser?.uid;
      if (!userId) return;

      await deleteDoc(doc(db, 'users', userId, 'customers', id));
      await fetchCustomers();
    } catch (error) {
      console.error('Error deleting customer:', error);
    }
  };

  const handleSaveCustomer = async () => {
    try {
      const userId = auth.currentUser?.uid;
      if (!userId) return;

      if (editingCustomer) {
        // Update existing customer
        await updateDoc(doc(db, 'users', userId, 'customers', editingCustomer.id), formData);
      } else {
        // Add new customer
        await addDoc(collection(db, 'users', userId, 'customers'), formData);
      }
      setOpenDialog(false);
      await fetchCustomers();
    } catch (error) {
      console.error('Error saving customer:', error);
    }
  };

  const handleLogout = async () => {
    await signOut(auth);
    navigate('/');
  };

  return (
    <Container maxWidth="md" sx={{ mt: 4 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 3 }}>
        <Typography variant="h4" component="h1">
          Customers
        </Typography>
        <Box>
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={handleAddCustomer}
            sx={{ mr: 2 }}
          >
            Add Customer
          </Button>
          <Button
            variant="outlined"
            color="secondary"
            startIcon={<LogoutIcon />}
            onClick={handleLogout}
          >
            Logout
          </Button>
        </Box>
      </Box>

      <Paper elevation={2}>
        <List>
          {customers.map((customer) => (
            <ListItem
              key={customer.id}
              component="div"
              sx={{ cursor: 'pointer' }}
              onClick={() => navigate(`/customer/${customer.id}`)}
            >
              <ListItemText
                primary={customer.name}
                secondary={customer.phone}
              />
              <ListItemSecondaryAction>
                <IconButton
                  edge="end"
                  aria-label="edit"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleEditCustomer(customer);
                  }}
                >
                  <EditIcon />
                </IconButton>
                <IconButton
                  edge="end"
                  aria-label="delete"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleDeleteCustomer(customer.id);
                  }}
                >
                  <DeleteIcon />
                </IconButton>
              </ListItemSecondaryAction>
            </ListItem>
          ))}
        </List>
      </Paper>

      <Dialog open={openDialog} onClose={() => setOpenDialog(false)}>
        <DialogTitle>
          {editingCustomer ? 'Edit Customer' : 'Add Customer'}
        </DialogTitle>
        <DialogContent>
          <TextField
            autoFocus
            margin="dense"
            label="Name"
            fullWidth
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
          />
          <TextField
            margin="dense"
            label="Phone"
            fullWidth
            value={formData.phone}
            onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
          />
          <TextField
            margin="dense"
            label="Address"
            fullWidth
            multiline
            rows={2}
            value={formData.address}
            onChange={(e) => setFormData({ ...formData, address: e.target.value })}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenDialog(false)}>Cancel</Button>
          <Button onClick={handleSaveCustomer} variant="contained">
            Save
          </Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
} 