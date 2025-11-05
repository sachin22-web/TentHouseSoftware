import { Response } from 'express';
import { EventWorker, Event, WorkerPayment } from '../models';
import { AuthRequest } from '../utils/auth';
import { eventWorkerSchema, workerPaymentSchema } from '../utils/validation';

export const getEventWorkers = async (req: AuthRequest, res: Response) => {
  try {
    const { eventId } = req.params;
    
    // Verify event exists
    const event = await Event.findById(eventId);
    if (!event) {
      return res.status(404).json({ error: 'Event not found' });
    }

    const workers = await EventWorker.find({ eventId })
      .sort({ createdAt: -1 });

    const totalWorkerCost = workers.reduce((sum, worker) => {
      const baseAmount = worker.agreedAmount || worker.payRate;
      return sum + baseAmount;
    }, 0);

    const totalPaid = workers.reduce((sum, worker) => sum + worker.totalPaid, 0);

    res.json({
      workers,
      totals: {
        totalWorkerCost,
        totalPaid,
        remaining: totalWorkerCost - totalPaid
      }
    });
  } catch (error) {
    console.error('Get event workers error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const createEventWorker = async (req: AuthRequest, res: Response) => {
  try {
    const { eventId } = req.params;
    
    // Verify event exists
    const event = await Event.findById(eventId);
    if (!event) {
      return res.status(404).json({ error: 'Event not found' });
    }

    const { error, value } = eventWorkerSchema.validate(req.body);
    if (error) {
      return res.status(400).json({ error: error.details[0].message });
    }

    const worker = new EventWorker({
      eventId,
      ...value
    });
    
    await worker.save();
    
    res.status(201).json(worker);
  } catch (error) {
    console.error('Create event worker error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const updateEventWorker = async (req: AuthRequest, res: Response) => {
  try {
    const { eventId, workerId } = req.params;
    
    const { error, value } = eventWorkerSchema.validate(req.body);
    if (error) {
      return res.status(400).json({ error: error.details[0].message });
    }

    const worker = await EventWorker.findOneAndUpdate(
      { _id: workerId, eventId },
      value,
      { new: true, runValidators: true }
    );

    if (!worker) {
      return res.status(404).json({ error: 'Worker not found' });
    }

    res.json(worker);
  } catch (error) {
    console.error('Update event worker error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const deleteEventWorker = async (req: AuthRequest, res: Response) => {
  try {
    const { eventId, workerId } = req.params;
    
    // First delete all payments for this worker
    await WorkerPayment.deleteMany({ eventId, workerId });
    
    // Then delete the worker
    const worker = await EventWorker.findOneAndDelete({ _id: workerId, eventId });
    if (!worker) {
      return res.status(404).json({ error: 'Worker not found' });
    }
    
    res.json({ message: 'Worker and associated payments deleted successfully' });
  } catch (error) {
    console.error('Delete event worker error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const createWorkerPayment = async (req: AuthRequest, res: Response) => {
  try {
    const { eventId, workerId } = req.params;
    
    // Verify worker exists
    const worker = await EventWorker.findOne({ _id: workerId, eventId });
    if (!worker) {
      return res.status(404).json({ error: 'Worker not found' });
    }

    const { error, value } = workerPaymentSchema.validate(req.body);
    if (error) {
      return res.status(400).json({ error: error.details[0].message });
    }

    // Check if payment amount exceeds remaining amount
    const baseAmount = worker.agreedAmount || worker.payRate;
    const newTotalPaid = worker.totalPaid + value.amount;
    
    if (newTotalPaid > baseAmount) {
      return res.status(400).json({ 
        error: `Payment amount exceeds remaining balance. Remaining: ₹${baseAmount - worker.totalPaid}` 
      });
    }

    const payment = new WorkerPayment({
      eventId,
      workerId,
      ...value
    });
    
    await payment.save();

    // Update worker's total paid and remaining amount
    worker.totalPaid = newTotalPaid;
    worker.remainingAmount = baseAmount - newTotalPaid;
    await worker.save();
    
    res.status(201).json({
      payment,
      workerUpdated: {
        totalPaid: worker.totalPaid,
        remainingAmount: worker.remainingAmount
      }
    });
  } catch (error) {
    console.error('Create worker payment error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const getWorkerPayments = async (req: AuthRequest, res: Response) => {
  try {
    const { eventId, workerId } = req.params;
    
    // Verify worker exists
    const worker = await EventWorker.findOne({ _id: workerId, eventId });
    if (!worker) {
      return res.status(404).json({ error: 'Worker not found' });
    }

    const payments = await WorkerPayment.find({ eventId, workerId })
      .sort({ paymentDate: -1 });

    res.json({
      payments,
      worker: {
        name: worker.name,
        role: worker.role,
        payRate: worker.payRate,
        agreedAmount: worker.agreedAmount,
        totalPaid: worker.totalPaid,
        remainingAmount: worker.remainingAmount
      }
    });
  } catch (error) {
    console.error('Get worker payments error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};
