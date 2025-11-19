import React, { useState } from 'react';
import { ResultData } from '../types';
import { useAuth } from '../context/AuthContext';

interface LogResultModalProps {
  onClose: () => void;
  onSave: (result: ResultData) => void;
  initial