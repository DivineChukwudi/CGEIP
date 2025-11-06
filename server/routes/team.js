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
    
    const team = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    res.json(team);
  } catch (error) {
    console.error('Error fetching team:', error);
    res.status(500).json({ error: error.message });
  }
});

// Admin only routes below
router.use('/admin/team', verifyToken);
router.use('/admin/team', checkRole(['admin']));

// Get all team members (admin)
router.get('/admin/team', async (req, res) => {
  try {
    const snapshot = await db.collection(collections.TEAM)
      .orderBy('order', 'asc')
      .get();
    
    const team = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    res.json(team);
  } catch (error) {
    console.error('Error fetching team (admin):', error);
    res.status(500).json({ error: error.message });
  }
});

// Add team member
router.post('/admin/team', async (req, res) => {
  try {
    const { name, role, bio, imageUrl, linkedin, github, email, order } = req.body;

    if (!name || !role) {
      return res.status(400).json({ error: 'Name and role are required' });
    }

    const memberData = {
      name,
      role,
      bio: bio || '',
      imageUrl: imageUrl || '',
      linkedin: linkedin || '',
      github: github || '',
      email: email || '',
      order: order || 0,
      createdAt: new Date().toISOString(),
      createdBy: req.user.uid
    };

    const docRef = await db.collection(collections.TEAM).add(memberData);
    res.status(201).json({ id: docRef.id, ...memberData });
  } catch (error) {
    console.error('Error adding team member:', error);
    res.status(500).json({ error: error.message });
  }
});

// Update team member
router.put('/admin/team/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const updateData = { 
      ...req.body, 
      updatedAt: new Date().toISOString(),
      updatedBy: req.user.uid
    };

    // Remove fields that shouldn't be updated
    delete updateData.id;
    delete updateData.createdAt;
    delete updateData.createdBy;

    await db.collection(collections.TEAM).doc(id).update(updateData);
    res.json({ message: 'Team member updated successfully' });
  } catch (error) {
    console.error('Error updating team member:', error);
    res.status(500).json({ error: error.message });
  }
});

// Delete team member
router.delete('/admin/team/:id', async (req, res) => {
  try {
    const { id } = req.params;
    await db.collection(collections.TEAM).doc(id).delete();
    res.json({ message: 'Team member deleted successfully' });
  } catch (error) {
    console.error('Error deleting team member:', error);
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;