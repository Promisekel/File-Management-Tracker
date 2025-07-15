export const formatDistanceToNow = (date) => {
  if (!date) return 'Unknown';
  
  const now = new Date();
  const targetDate = date.toDate ? date.toDate() : new Date(date);
  const diffInMilliseconds = now - targetDate;
  const diffInMinutes = Math.floor(diffInMilliseconds / (1000 * 60));
  const diffInHours = Math.floor(diffInMinutes / 60);
  const diffInDays = Math.floor(diffInHours / 24);

  if (diffInMinutes < 1) {
    return 'Just now';
  } else if (diffInMinutes < 60) {
    return `${diffInMinutes} minute${diffInMinutes !== 1 ? 's' : ''} ago`;
  } else if (diffInHours < 24) {
    return `${diffInHours} hour${diffInHours !== 1 ? 's' : ''} ago`;
  } else {
    return `${diffInDays} day${diffInDays !== 1 ? 's' : ''} ago`;
  }
};

export const formatTimeRemaining = (dueDate) => {
  if (!dueDate) return 'No deadline';
  
  const now = new Date();
  const targetDate = dueDate.toDate ? dueDate.toDate() : new Date(dueDate);
  const diffInMilliseconds = targetDate - now;
  
  if (diffInMilliseconds <= 0) {
    const overdue = Math.abs(diffInMilliseconds);
    const overdueHours = Math.floor(overdue / (1000 * 60 * 60));
    const overdueMinutes = Math.floor((overdue % (1000 * 60 * 60)) / (1000 * 60));
    const overdueSeconds = Math.floor((overdue % (1000 * 60)) / 1000);
    
    if (overdueHours > 0) {
      return `${overdueHours}h ${overdueMinutes}m ${overdueSeconds}s overdue`;
    } else if (overdueMinutes > 0) {
      return `${overdueMinutes}m ${overdueSeconds}s overdue`;
    } else {
      return `${overdueSeconds}s overdue`;
    }
  }
  
  const hours = Math.floor(diffInMilliseconds / (1000 * 60 * 60));
  const minutes = Math.floor((diffInMilliseconds % (1000 * 60 * 60)) / (1000 * 60));
  const seconds = Math.floor((diffInMilliseconds % (1000 * 60)) / 1000);
  
  if (hours > 0) {
    return `${hours}h ${minutes}m ${seconds}s remaining`;
  } else if (minutes > 0) {
    return `${minutes}m ${seconds}s remaining`;
  } else {
    return `${seconds}s remaining`;
  }
};

export const formatDate = (date) => {
  if (!date) return 'Unknown';
  
  const targetDate = date.toDate ? date.toDate() : new Date(date);
  return targetDate.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
};

export const isOverdue = (dueDate) => {
  if (!dueDate) return false;
  
  const now = new Date();
  const targetDate = dueDate.toDate ? dueDate.toDate() : new Date(dueDate);
  return now > targetDate;
};

export const getStatusColor = (status) => {
  switch (status) {
    case 'pending':
      return 'gray';
    case 'active':
      return 'warning';
    case 'returned':
      return 'success';
    case 'overdue':
      return 'danger';
    default:
      return 'gray';
  }
};
