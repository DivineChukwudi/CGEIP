// server/routes/team.js
const express = require('express');
const { db, collections } = require('../config/firebase');
const { verifyToken, checkRole } = require('../middlewares/auth');

const router = express.Router();

// Public route - Get all team members (NO AUTH REQUIRED)
router.get('/public/team', async (req, res) => {
  try {
    const snapshot = await db.collection(collections.TEAM)
      .orderBy('order', 'asc')
      .get();
    
    const team = snapshot.docs.map(doc => ({ 
      id: doc.id, 
      ...doc.data() 
    }));
    
    res.json(team);
  } catch (error) {
    console.error('Error fetching team:', error);
    res.status(500).json({ error: 'Failed to fetch team members' });
  }
});

// Admin only routes below
// Get all team members (admin)
router.get('/admin/team', verifyToken, checkRole(['admin']), async (req, res) => {
  try {
    const snapshot = await db.collection(collections.TEAM)
      .orderBy('order', 'asc')
      .get();
    
    const team = snapshot.docs.map(doc => ({ 
      id: doc.id, 
      ...doc.data() 
    }));
    
    res.json(team);
  } catch (error) {
    console.error('Error fetching team (admin):', error);
    res.status(500).json({ error: 'Failed to fetch team members' });
  }
});

// Add team member
router.post('/admin/team', verifyToken, checkRole(['admin']), async (req, res) => {
  try {
    const { name, role, bio, photo, linkedin, github, email, order } = req.body;

    if (!name || !role) {
      return res.status(400).json({ error: 'Name and role are required' });
    }

    const memberData = {
      name: name.trim(),
      role: role.trim(),
      bio: bio?.trim() || '',
      photo: photo?.trim() || '',
      linkedin: linkedin?.trim() || '',
      github: github?.trim() || '',
      email: email?.trim() || '',
      order: typeof order === 'number' ? order : 0,
      createdAt: new Date().toISOString(),
      createdBy: req.user.uid
    };

    const docRef = await db.collection(collections.TEAM).add(memberData);
    
    res.status(201).json({ 
      id: docRef.id, 
      ...memberData 
    });
  } catch (error) {
    console.error('Error adding team member:', error);
    res.status(500).json({ error: 'Failed to add team member' });
  }
});

// Update team member
router.put('/admin/team/:id', verifyToken, checkRole(['admin']), async (req, res) => {
  try {
    const { id } = req.params;
    
    // Check if member exists
    const memberDoc = await db.collection(collections.TEAM).doc(id).get();
    if (!memberDoc.exists) {
      return res.status(404).json({ error: 'Team member not found' });
    }

    const { name, role, bio, photo, linkedin, github, email, order } = req.body;

    if (!name || !role) {
      return res.status(400).json({ error: 'Name and role are required' });
    }

    const updateData = {
      name: name.trim(),
      role: role.trim(),
      bio: bio?.trim() || '',
      photo: photo?.trim() || '',
      linkedin: linkedin?.trim() || '',
      github: github?.trim() || '',
      email: email?.trim() || '',
      order: typeof order === 'number' ? order : 0,
      updatedAt: new Date().toISOString(),
      updatedBy: req.user.uid
    };

    await db.collection(collections.TEAM).doc(id).update(updateData);
    
    res.json({ 
      message: 'Team member updated successfully',
      id,
      ...updateData
    });
  } catch (error) {
    console.error('Error updating team member:', error);
    res.status(500).json({ error: 'Failed to update team member' });
  }
});

// Delete team member
router.delete('/admin/team/:id', verifyToken, checkRole(['admin']), async (req, res) => {
  try {
    const { id } = req.params;
    
    // Check if member exists
    const memberDoc = await db.collection(collections.TEAM).doc(id).get();
    if (!memberDoc.exists) {
      return res.status(404).json({ error: 'Team member not found' });
    }

    await db.collection(collections.TEAM).doc(id).delete();
    
    res.json({ 
      message: 'Team member deleted successfully',
      id 
    });
  } catch (error) {
    console.error('Error deleting team member:', error);
    res.status(500).json({ error: 'Failed to delete team member' });
  }
});

module.exports = router;