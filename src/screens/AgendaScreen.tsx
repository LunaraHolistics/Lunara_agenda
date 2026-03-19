import React, { useState, useEffect, useRef } from 'react';
import { ChevronLeft, ChevronRight, Plus, Calendar as CalendarIcon, ShieldAlert, X, GripVertical, Clock, AlertCircle, CheckCircle2, Calendar, Trash2 } from 'lucide-react';
import { Cliente, Terapia, Agendamento, Bloqueio, Pacote } from '../types';
import { StorageService } from '../utils/storage';
import { useAppContext } from '../AppContext';

type DiaBloqueado = {
  data: string;
  motivo?: string;
};

export default function AgendaScreen() {
  const { 
    completeAppointment, 
    showNotification, 
    confirmAction, 
    safeDate, 
    promptAction, 
    clientes,
    terapias,
    agendamentos,
    pacotes,
    bloqueios,
    updateAgendamento,
    updatePacote,
    setAgendamentos,
    setPacotes,
    addTransacao,
    addBloqueio,
    deleteBloqueio
  } = useAppContext();
  
  // State
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [diasBloqueados, setDiasBloqueados] = useState<DiaBloqueado[]>([]);

  useEffect(() => {
    const saved = localStorage.getItem('diasBloqueados');
    if (saved) {
      try {
        setDiasBloqueados(JSON.parse(saved));
      } catch (e) {
        console.error('Erro ao carregar dias bloqueados', e);
      }
    }
  }, []);

  useEffect(() => {
    localStorage.setItem('diasBloqueados', JSON.stringify(diasBloqueados));
  }, [diasBloqueados]);
  
  // UI State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isBloqueiosOpen, setIsBloqueiosOpen] = useState(false);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [isDayAgendaOpen, setIsDayAgendaOpen] = useState(false);
  const [minimizado, setMinimizado] = useState(false);
  const [showOrfaos, setShowOrfaos] = useState(false);
  const [expandedClienteId, setExpandedClienteId] = useState<string | null>(null);
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [dragOverDay, setDragOverDay] = useState<number | null>(null);
  const [dragItem, setDragItem] = useState<any>(null);
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const [isMobile, setIsMobile] = useState(false);
  const dragPreviewRef = useRef<HTMLDivElement>(null);
  const longPressTimer = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    setIsMobile(window.matchMedia("(pointer: coarse)").matches);
  }, []);

  // Form State - Agendamento
  const [formClienteId, setFormClienteId] = useState('');
  const [activePackage, setActivePackage] = useState<Pacote | null>(null);

  useEffect(() => {
    if (formClienteId) {
      const active = (pacotes || []).find(p => p.clienteId === formClienteId);
      setActivePackage(active || null);
    } else {
      setActivePackage(null);
    }
  }, [formClienteId, pacotes]);

  const [formTerapiaIds, setFormTerapiaIds] = useState<string[]>([]);
  const [formPacoteId, setFormPacoteId] = useState<string | undefined>(undefined);
  const [formItemPacoteId, setFormItemPacoteId] = useState<string | undefined>(undefined);
  const [formData, setFormData] = useState('');
  const [formHora, setFormHora] = useState('');
  const [formValor, setFormValor] = useState(0);
  const [formStatusPagamento, setFormStatusPagamento] = useState<'Pendente' | 'Pago'>('Pendente');
  const [recorrencia, setRecorrencia] = useState(false);
  const [frequencia, setFrequencia] = useState<'semanal' | 'quinzenal'>('semanal');
  const [dataFim, setDataFim] = useState('');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const isDragging = useRef(false);

  // Form State - Bloqueio
  const [blockData, setBlockData] = useState('');
  const [blockHoraInicio, setBlockHoraInicio] = useState('');
  const [blockHoraFim, setBlockHoraFim] = useState('');
  const [blockMotivo, setBlockMotivo] = useState('');

  useEffect(() => {
    // fetchData removido para Local-First
  }, [refreshTrigger]);

  // Calendar Helpers
  const getDaysInMonth = (year: number, month: number) => new Date(year, month + 1, 0).getDate();
  const getFirstDayOfMonth = (year: number, month: number) => new Date(year, month, 1).getDay();
  const prevMonth = () => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1, 1));
  const nextMonth = () => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 1));

  const bloquearDia = (data: string) => {
    promptAction('Motivo do bloqueio (opcional):', '', (motivo) => {
      setDiasBloqueados(prev => [...prev, { data, motivo }]);
      showNotification('Dia bloqueado!', 'success');
    });
  };

  const desbloquearDia = (data: string) => {
    confirmAction('Deseja desbloquear este dia?', () => {
      setDiasBloqueados(prev => prev.filter(d => d.data !== data));
      showNotification('Dia desbloqueado!', 'info');
    });
  };

  const year = currentMonth.getFullYear();
  const month = currentMonth.getMonth();
  const daysInMonth = getDaysInMonth(year, month);
  const firstDay = getFirstDayOfMonth(year, month);
  const monthName = new Intl.DateTimeFormat('pt-BR', { month: 'long' }).format(currentMonth);

  useEffect(() => {
    const handleAutoScroll = (e: DragEvent) => {
      const threshold = 80;
      const scrollSpeed = 20;

      const y = e.clientY;
      const height = window.innerHeight;

      if (y < threshold) {
        window.scrollBy({ top: -scrollSpeed, behavior: 'auto' });
      }

      if (y > height - threshold) {
        window.scrollBy({ top: scrollSpeed, behavior: 'auto' });
      }
    };

    window.addEventListener('dragover', handleAutoScroll);

    return () => {
      window.removeEventListener('dragover', handleAutoScroll);
    };
  }, []);

  const handleTouchStart = (e: React.TouchEvent, item: any) => {
    setDragItem(item);
    setDraggingId(item.id);
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!dragItem) return;
    const touch = e.touches[0];
    const element = document.elementFromPoint(touch.clientX, touch.clientY);
    const dayElement = element?.closest('[data-day]');
    if (dayElement) {
      const day = parseInt(dayElement.getAttribute('data-day') || '0');
      setDragOverDay(day);
    } else {
      setDragOverDay(null);
    }
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (!dragItem || dragOverDay === null) {
      setDragItem(null);
      setDraggingId(null);
      setDragOverDay(null);
      return;
    }

    const day = dragOverDay;
    const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    const diaEstaBloqueado = diasBloqueados.some(d => d.data === dateStr);

    if (diaEstaBloqueado) {
      showNotification('Este dia está bloqueado.', 'error');
      setDragItem(null);
      setDraggingId(null);
      setDragOverDay(null);
      return;
    }

    if (dragItem.type === 'agendamento') {
      const item = (agendamentos || []).find(a => String(a.id) === String(dragItem.id));
      if (item?.statusAtendimento === 'Concluido') {
        showNotification('Não é possível mover uma sessão concluída.', 'error');
      } else {
        setAgendamentos(prev =>
          prev.map(i =>
            String(i.id) === String(dragItem.id)
              ? { ...i, data: dateStr, statusAtendimento: 'Agendado' }
              : i
          )
        );
        showNotification('Agendamento reagendado!', 'success');
      }
    }

    setDragItem(null);
    setDraggingId(null);
    setDragOverDay(null);
  };

  // Handlers
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    e.dataTransfer.dropEffect = 'move';
  };

  const handleDragStart = (e: React.DragEvent, data: { id?: string; type: 'agendamento' | 'terapia'; clienteId?: string; terapiaId?: string; pacoteId?: string; itemPacoteId?: string; name: string; time: string }) => {
    e.stopPropagation();
    e.dataTransfer.effectAllowed = 'move';
    
    const id = data.id || e.currentTarget.getAttribute('data-id');
    if (id) {
      e.dataTransfer.setData('id', String(id));
      e.dataTransfer.setData('type', data.type);
      setDraggingId(String(id));
      console.log('DRAG START:', id, data.type);
    }
    
    if (data.clienteId) e.dataTransfer.setData('clienteId', String(data.clienteId));
    if (data.terapiaId) e.dataTransfer.setData('terapiaId', String(data.terapiaId));
    if (data.pacoteId) e.dataTransfer.setData('pacoteId', String(data.pacoteId));
    if (data.itemPacoteId) e.dataTransfer.setData('itemPacoteId', String(data.itemPacoteId));

    if (dragPreviewRef.current) {
      const preview = dragPreviewRef.current;
      const nameEl = preview.querySelector('.preview-name');
      const timeEl = preview.querySelector('.preview-time');
      if (nameEl) nameEl.textContent = data.name;
      if (timeEl) timeEl.textContent = data.time;
      
      e.dataTransfer.setDragImage(preview, 70, 30);
    }
  };

  useEffect(() => {
    const total = formTerapiaIds.reduce((sum, tid) => {
      const terapia = terapias.find(t => t.id === tid);
      return sum + (terapia?.valor || 0);
    }, 0);
    setFormValor(total);
  }, [formTerapiaIds, terapias]);

  const handleDrop = (e: React.DragEvent, day: number) => {
    e.preventDefault();
    e.stopPropagation();
    isDragging.current = false;

    const type = e.dataTransfer.getData('type');
    const id = e.dataTransfer.getData('id');
    const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    const diaEstaBloqueado = diasBloqueados.some(d => d.data === dateStr);

    if (diaEstaBloqueado) {
      showNotification('Este dia está bloqueado.', 'error');
      setDraggingId(null);
      return;
    }

    console.log('DROP:', type, id, dateStr);

    if (!id) return;

    if (type === 'agendamento') {
      const item = (agendamentos || []).find(a => String(a.id) === String(id));
      if (item?.statusAtendimento === 'Concluido') {
        showNotification('Não é possível mover uma sessão concluída.', 'error');
        setDraggingId(null);
        return;
      }

      setAgendamentos(prev =>
        prev.map(item =>
          String(item.id) === String(id)
            ? { ...item, data: dateStr, statusAtendimento: 'Agendado' }
            : item
        )
      );
      showNotification('Agendamento agendado!', 'success');
    }

    if (type === 'terapia') {
      setFormClienteId(e.dataTransfer.getData('clienteId') || '');
      setFormData(dateStr);
      setFormTerapiaIds(prev => [...prev, e.dataTransfer.getData('terapiaId')]);
      setFormHora('09:00');
      setFormPacoteId(e.dataTransfer.getData('pacoteId') || undefined);
      setFormItemPacoteId(e.dataTransfer.getData('itemPacoteId') || undefined);
      setIsModalOpen(true);
    }

    setDraggingId(null);
  };

  const handleDropToFooter = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const type = e.dataTransfer.getData('type');
    const id = e.dataTransfer.getData('id');

    if (type === 'agendamento' && id) {
      const item = (agendamentos || []).find(a => String(a.id) === String(id));
      if (item?.statusAtendimento === 'Concluido') {
        showNotification('Não é possível mover uma sessão concluída.', 'error');
        setDraggingId(null);
        return;
      }

      setAgendamentos(prev =>
        prev.map(item =>
          String(item.id) === String(id)
            ? { ...item, data: '', hora: '', statusAtendimento: 'Disponivel' }
            : item
        )
      );
      showNotification('Agendamento movido para disponíveis!', 'success');
    }
    setDraggingId(null);
  };

  const handleSaveAgendamento = async () => {
    if (!formClienteId || formTerapiaIds.length === 0 || !formData || !formHora) {
      setErrorMessage('Preencha todos os campos obrigatórios.');
      return;
    }

    const diaEstaBloqueado = diasBloqueados.some(d => d.data === formData);
    if (diaEstaBloqueado) {
      setErrorMessage('Este dia está bloqueado.');
      return;
    }

    const datesToSchedule: string[] = [formData];

    if (recorrencia && dataFim) {
      let curr = new Date(`${formData}T00:00:00`);
      const end = new Date(`${dataFim}T23:59:59`);
      const step = frequencia === 'semanal' ? 7 : 14;
      while (true) {
        curr.setDate(curr.getDate() + step);
        if (curr > end) break;
        datesToSchedule.push(curr.toISOString().split('T')[0]);
      }
    }

    const saveAll = () => {
      const newAgendamentos: Agendamento[] = [];

      for (let d of datesToSchedule) {
        for (let tid of formTerapiaIds) {
          const agendamentoId = crypto.randomUUID();
          const newAgendamento: Agendamento = {
            id: agendamentoId,
            clienteId: formClienteId,
            terapiaId: tid,
            data: d,
            hora: formHora,
            pacoteId: formPacoteId,
            statusPagamento: 'Pendente',
            statusAtendimento: 'Agendado',
            valorCobrado: 0
          };
          newAgendamentos.push(newAgendamento);
        }
      }

      // Handle package updates if applicable
      if (formPacoteId && formItemPacoteId) {
        setPacotes(prev => (prev || []).map(p => {
          if (p.id === formPacoteId) {
            const updatedItens = (p.itens || []).map((item) => {
              if (item.id === formItemPacoteId) {
                return { ...item, quantidadeRestante: Math.max(0, Number(item.quantidadeRestante || 0) - formTerapiaIds.length * datesToSchedule.length) };
              }
              return item;
            });
            return { ...p, itens: updatedItens };
          }
          return p;
        }));
      }

      // Update Agendamentos
      setAgendamentos(prev => [...(prev || []), ...newAgendamentos]);

      setIsModalOpen(false);
      setFormTerapiaIds([]); // Reset therapy IDs
      showNotification('Agendado com sucesso!', 'success');
    };

    await saveAll();
  };

  const handleDeleteAgendamento = (agendamentoId: string) => {
    const item = (agendamentos || []).find(a => String(a.id) === String(agendamentoId));
    if (item?.statusAtendimento === 'Concluido') {
      showNotification('Não é possível remover uma sessão concluída.', 'error');
      return;
    }

    confirmAction('Deseja realmente remover este agendamento da agenda? Ele ficará disponível para reagendamento.', () => {
      setAgendamentos(prev => (prev || []).map(a => 
        String(a.id) === String(agendamentoId) 
          ? { ...a, data: '', hora: '', statusAtendimento: 'Disponivel' } 
          : a
      ));
      showNotification('Agendamento movido para disponíveis!', 'success');
    }, { isDanger: true });
  };

  const handleCompleteAppointment = async (id: string) => {
    await completeAppointment(id);
    setRefreshTrigger(prev => prev + 1);
  };

  const openDayAgenda = (day: number) => {
    const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    setSelectedDate(dateStr);
    setIsDayAgendaOpen(true);
  };

  const openAppointmentModal = (e: React.MouseEvent, ag: Agendamento) => {
    e.stopPropagation();
    if (isDragging.current) return;
    setSelectedDate(ag.data);
    setIsDayAgendaOpen(true);
  };

  const handleMobileSelect = (ag: Agendamento) => {
    promptAction('Nova data (YYYY-MM-DD):', ag.data, (dateStr) => {
      if (!/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
        showNotification('Formato de data inválido. Use YYYY-MM-DD', 'error');
        return;
      }
      
      const diaEstaBloqueado = diasBloqueados.some(d => d.data === dateStr);
      if (diaEstaBloqueado) {
        showNotification('Este dia está bloqueado.', 'error');
        return;
      }
      
      setAgendamentos(prev =>
        prev.map(item =>
          String(item.id) === String(ag.id)
            ? { ...item, data: dateStr, statusAtendimento: 'Agendado' }
            : item
        )
      );
      showNotification('Agendamento reagendado!', 'success');
    });
  };

  // Long Press logic for dragging existing appointments
  const startLongPress = (id: string) => {
    longPressTimer.current = setTimeout(() => {
      // Logic for starting drag if needed via state
    }, 500);
  };

  return (
    <div className="flex flex-col h-full relative bg-[var(--color-bg-light)] dark:bg-[var(--color-bg-dark)] select-none">
      {/* Header */}
      <div className="p-4 bg-[var(--color-surface-light)] dark:bg-[var(--color-surface-dark)] border-b border-gray-200 dark:border-gray-800 sticky top-0 z-10 flex justify-between items-center">
        <div className="flex items-center gap-4">
          <button onClick={prevMonth} className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full text-[var(--color-text-sec-light)] transition-colors"><ChevronLeft size={24} /></button>
          <h2 className="text-lg font-bold text-[var(--color-text-main-light)] dark:text-[var(--color-text-main-dark)] min-w-[140px] text-center capitalize">
            {monthName} <span className="text-[var(--color-primary)]">{year}</span>
          </h2>
          <button onClick={nextMonth} className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full text-[var(--color-text-sec-light)] transition-colors"><ChevronRight size={24} /></button>
        </div>
        <div className="flex gap-2">
          <button 
            onClick={() => setShowOrfaos(!showOrfaos)}
            className={`p-2 rounded-full transition-all ${showOrfaos ? 'bg-[var(--color-primary)] text-white shadow-lg scale-110' : 'bg-[var(--color-primary)]/10 text-[var(--color-primary)] hover:bg-[var(--color-primary)]/20'}`}
            title="Sessões Órfãs"
          >
            <AlertCircle size={20} />
          </button>
          <button 
            onClick={() => setIsBloqueiosOpen(true)}
            className="p-2 bg-[var(--color-error)]/10 text-[var(--color-error)] rounded-full hover:bg-[var(--color-error)]/20 transition-colors"
          >
            <ShieldAlert size={20} />
          </button>
        </div>
      </div>

      {/* Orphan Sessions View */}
      {showOrfaos && (
        <div className="bg-orange-50 dark:bg-orange-950/20 p-4 border-b border-orange-100 dark:border-orange-900/30 animate-in slide-in-from-top duration-300">
          <h3 className="text-[10px] font-black text-orange-800 dark:text-orange-300 uppercase tracking-[0.2em] mb-3 flex items-center gap-2">
            <AlertCircle size={14} /> Pacotes Aguardando Agendamento
          </h3>
          <div className="flex overflow-x-auto gap-3 pb-2 no-scrollbar">
            {(clientes || []).map(cliente => {
              const clientePacotes = (pacotes || []).filter(p => p.clienteId === cliente.id);
              const orfaos = clientePacotes.flatMap(p => {
                return p.itens.filter(item => Number(item.quantidadeRestante || 0) > 0).map(item => ({
                  pacoteId: p.id,
                  itemPacoteId: item.id,
                  terapiaId: item.terapiaId,
                  nome: (terapias || []).find(t => t.id === item.terapiaId)?.nome || 'Desconhecida',
                  restante: item.quantidadeRestante
                }));
              });

              if (orfaos.length === 0) return null;

              return (
                <div key={cliente.id} className="bg-white dark:bg-gray-800 p-3 rounded-xl shadow-sm border border-orange-200 dark:border-orange-800 shrink-0 min-w-[160px]">
                  <p className="text-[11px] font-bold text-[var(--color-text-main-light)] dark:text-[var(--color-text-main-dark)] mb-2 truncate border-b border-gray-100 dark:border-gray-700 pb-1">{cliente.nome}</p>
                  <div className="space-y-1.5">
                          {orfaos.map((o, idx) => (
                            <div 
                              key={idx} 
                              draggable={true}
                              onDragStart={(e) => {
                                e.stopPropagation();
                                isDragging.current = true;
                                const target = e.currentTarget;
                                setTimeout(() => {
                                  target.style.opacity = '0.4';
                                  target.style.transform = 'scale(1.05)';
                                  target.style.boxShadow = '0 10px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.1)';
                                }, 0);
                                handleDragStart(e, {
                                  id: o.terapiaId,
                                  type: 'terapia',
                                  clienteId: cliente.id,
                                  terapiaId: o.terapiaId,
                                  pacoteId: o.pacoteId,
                                  itemPacoteId: o.itemPacoteId,
                                  name: cliente.nome || 'Cliente',
                                  time: 'Novo'
                                });
                              }}
                              onTouchStart={(e) => handleTouchStart(e, {
                                id: o.terapiaId,
                                type: 'terapia',
                                clienteId: cliente.id,
                                terapiaId: o.terapiaId,
                                pacoteId: o.pacoteId,
                                itemPacoteId: o.itemPacoteId,
                                name: cliente.nome || 'Cliente',
                                time: 'Novo'
                              })}
                        onDragEnd={(e) => {
                          e.stopPropagation();
                          isDragging.current = false;
                          setDraggingId(null);
                          e.currentTarget.style.opacity = '1';
                          e.currentTarget.style.transform = 'scale(1)';
                          e.currentTarget.style.boxShadow = 'none';
                        }}
                        style={{ userSelect: 'none', touchAction: 'none' }}
                        className="flex justify-between items-center gap-2 cursor-grab active:cursor-grabbing bg-orange-50 dark:bg-orange-900/20 p-1 rounded transition-all"
                      >
                        <span className="text-[10px] text-[var(--color-text-sec-light)] dark:text-[var(--color-text-sec-dark)] truncate">{o.nome}</span>
                        <span className="text-[10px] font-black text-white bg-orange-500 px-2 py-0.5 rounded-full">{o.restante}</span>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Calendar Grid */}
      <div className="flex-1 overflow-y-auto p-4 pb-64 scrollbar-hide relative z-0">
        <div className="grid grid-cols-7 gap-1 mb-2">
          {['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'].map(d => (
            <div key={d} className="text-center text-[10px] font-black uppercase tracking-tighter text-[var(--color-text-sec-light)] dark:text-[var(--color-text-sec-dark)] py-2">
              {d}
            </div>
          ))}
        </div>
        
        <div className="space-y-1">
          {(() => {
            console.log("RENDER CALENDÁRIO", agendamentos.length);
            const weeks: (number | null)[][] = [];
            let currentWeek: (number | null)[] = Array(firstDay).fill(null);
            for (let i = 1; i <= daysInMonth; i++) {
              currentWeek.push(i);
              if (currentWeek.length === 7) {
                weeks.push(currentWeek);
                currentWeek = [];
              }
            }
            if (currentWeek.length > 0) {
              while (currentWeek.length < 7) currentWeek.push(null);
              weeks.push(currentWeek);
            }

            return weeks.map((week, weekIdx) => {
              return (
                <div key={weekIdx} className="grid grid-cols-7 gap-1 relative">
                  {week.map((day, dayIdx) => {
                    if (day === null) return <div key={`empty-${weekIdx}-${dayIdx}`} className="aspect-square opacity-20" />;
                    
                    const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
                    const diaEstaBloqueado = diasBloqueados.some(d => d.data === dateStr);
                    const dayAgendamentos = (agendamentos || [])
                      .filter(a => String(a.data).slice(0, 10) === dateStr && (a.statusAtendimento === 'Agendado' || a.statusAtendimento === 'Concluido'))
                      .sort((a, b) => a.hora.localeCompare(b.hora));
                    const hasBloqueio = (bloqueios || []).some(b => b.data === dateStr);
                    const isToday = new Date().toISOString().startsWith(dateStr);

                    return (
                      <div 
                        key={`${year}-${month}-${day}`} 
                        data-day={day}
                        onTouchMove={handleTouchMove}
                        onTouchEnd={handleTouchEnd}
                        onClick={(e) => {
                          e.stopPropagation();
                          if (isDragging.current) return;
                          if (diaEstaBloqueado) {
                            desbloquearDia(dateStr);
                          } else {
                            if (dayAgendamentos.length === 0 && !hasBloqueio) {
                              confirmAction('Deseja bloquear este dia?', () => bloquearDia(dateStr));
                            } else {
                              openDayAgenda(day);
                            }
                          }
                        }}
                        onDragOver={(e) => {
                          if (diaEstaBloqueado) return;
                          handleDragOver(e);
                          setDragOverDay(day);
                        }}
                        onDragLeave={() => setDragOverDay(null)}
                        onDrop={(e) => {
                          if (diaEstaBloqueado) return;
                          setDragOverDay(null);
                          console.log('--- DROP DETECTED ---');
                          console.log('Target Day:', day);
                          handleDrop(e, day);
                        }}
                        className={`min-h-[110px] h-auto rounded-xl flex flex-col p-1.5 relative cursor-pointer transition-all border ${
                          diaEstaBloqueado 
                            ? 'bg-red-100 dark:bg-red-900/30 border-red-200 dark:border-red-800'
                            : dragOverDay === day
                              ? 'ring-2 ring-[var(--color-primary)] bg-[var(--color-primary)]/10 border-dashed scale-105 z-10'
                              : isToday 
                                ? 'bg-[var(--color-primary)]/5 border-[var(--color-primary)]' 
                                : 'bg-[var(--color-surface-light)] dark:bg-[var(--color-surface-dark)] border-gray-100 dark:border-gray-800'
                        } hover:shadow-md hover:border-[var(--color-primary)]/30`}
                      >
                        <div className="flex justify-between items-center mb-1">
                          <span className={`text-[11px] font-black ${isToday ? 'text-[var(--color-primary)]' : 'text-[var(--color-text-sec-light)] opacity-50'}`}>{day}</span>
                          {hasBloqueio && <ShieldAlert size={10} className="text-[var(--color-error)]" />}
                          {diaEstaBloqueado && <span className="text-[9px] font-black text-red-600 dark:text-red-400">🔒</span>}
                        </div>
                        
                        {/* Debug Info */}
                        <div className="flex flex-col text-[7px] opacity-30 pointer-events-none mb-1">
                          <span>{dateStr}</span>
                          <span>Total: {dayAgendamentos.length}</span>
                        </div>

                        { !diaEstaBloqueado && (
                          <div className="flex flex-col gap-1">
                            {dayAgendamentos.map(ag => {
                              const cliente = (clientes || []).find(c => c.id === ag.clienteId);
                              const isConcluido = ag.statusAtendimento === 'Concluido';
                              return (
                                <div 
                                  key={ag.id}
                                  draggable={!isConcluido && !isMobile}
                                  data-id={ag.id}
                                  onClick={(e) => {
                                    if (isMobile) {
                                      handleMobileSelect(ag);
                                    } else {
                                      openAppointmentModal(e, ag);
                                    }
                                  }}
                                  onDragStart={(e) => {
                                    if (ag.statusAtendimento === 'Concluido') {
                                      e.preventDefault();
                                      showNotification('Não é possível mover uma sessão concluída.', 'error');
                                      return;
                                    }
                                    e.stopPropagation();
                                    isDragging.current = true;
                                    const target = e.currentTarget;
                                    setTimeout(() => {
                                      target.style.opacity = '0.4';
                                      target.style.transform = 'scale(1.05)';
                                      target.style.boxShadow = '0 10px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.1)';
                                    }, 0);
                                    handleDragStart(e, {
                                      id: ag.id,
                                      type: 'agendamento',
                                      name: cliente?.nome || 'Cliente',
                                      time: ag.hora
                                    });
                                  }}
                                  onDragEnd={(e) => {
                                    e.stopPropagation();
                                    isDragging.current = false;
                                    setDraggingId(null);
                                    e.currentTarget.style.opacity = '1';
                                    e.currentTarget.style.transform = 'scale(1)';
                                    e.currentTarget.style.boxShadow = 'none';
                                  }}
                                  style={{ 
                                    userSelect: 'none', 
                                    touchAction: 'none', 
                                    WebkitUserDrag: isConcluido ? 'none' : 'element'
                                  } as any}
                                  className={`text-[9px] p-1 rounded border leading-tight transition-all ${isConcluido ? '' : 'cursor-grab active:cursor-grabbing'} ${
                                    draggingId === ag.id ? 'opacity-50' : ''
                                  } ${
                                    isConcluido ? 'bg-gray-100 text-gray-400 border-gray-200' : 'bg-white dark:bg-gray-700 text-[var(--color-primary)] border-[var(--color-primary)]/30'
                                  }`}
                                >
                                  <div className="flex justify-between items-center font-black">
                                    <span>{ag.hora}</span>
                                    {isConcluido && <CheckCircle2 size={8} />}
                                  </div>
                                  <div className="truncate">{cliente?.nome?.split(' ')[0]}</div>
                                </div>
                              );
                            })}
                          </div>
                        )}
                        </div>
                    );
                  })}
                </div>
              );
            });
          })()}
        </div>
      </div>

      {/* Draggable Clients Area */}
      <div className="absolute bottom-0 left-0 right-0 bg-[var(--color-surface-light)]/95 dark:bg-[var(--color-surface-dark)]/95 backdrop-blur-md border-t border-gray-200 dark:border-gray-800 p-4 pb-10 shadow-[0_-15px_30px_-5px_rgba(0,0,0,0.15)] z-20 rounded-t-[2.5rem]">
        <div className="flex justify-between items-center mb-4">
          <div className="w-12 h-1.5 bg-gray-300 dark:bg-gray-700 rounded-full mx-auto opacity-50"></div>
          <button 
            onClick={() => setMinimizado(!minimizado)}
            className="text-[10px] font-bold text-[var(--color-primary)] bg-[var(--color-primary)]/10 px-3 py-1 rounded-full uppercase tracking-tighter transition-all active:scale-95"
          >
            {minimizado ? 'Expandir' : 'Minimizar'}
          </button>
        </div>

        <div className={`transition-all duration-300 overflow-hidden ${minimizado ? 'max-h-0 opacity-0' : 'max-h-[1000px] opacity-100'}`}>
          <h3 className="text-[10px] font-black text-[var(--color-text-sec-light)] dark:text-[var(--color-text-sec-dark)] uppercase tracking-widest mb-4 flex items-center justify-center gap-2">
            <GripVertical size={14} className="animate-pulse" /> Arraste a terapia para agendar
          </h3>
          <div className="flex overflow-x-auto pb-4 gap-3 snap-x scroll-smooth no-scrollbar">
            {(clientes || []).filter(cliente => (pacotes || []).some(p => p.clienteId === cliente.id)).map(cliente => {
              const isExpanded = expandedClienteId === cliente.id;
              const clientePacotes = (pacotes || []).filter(p => p.clienteId === cliente.id);
              const terapiasContratadas = clientePacotes.flatMap(p => {
                return p.itens.map(item => ({
                  pacoteId: p.id,
                  itemPacoteId: item.id,
                  terapiaId: item.terapiaId,
                  nome: (terapias || []).find(t => t.id === item.terapiaId)?.nome || 'Desconhecida',
                  restante: item.quantidadeRestante,
                  total: item.quantidadeTotal
                }));
              });

              return (
                <div key={cliente.id} className={`snap-start shrink-0 flex flex-col gap-2 transition-all duration-300 ${isExpanded ? 'min-w-[180px]' : 'min-w-[120px]'}`}>
                  <div 
                    onClick={() => setExpandedClienteId(isExpanded ? null : cliente.id)}
                    className={`px-4 py-3 rounded-2xl border shadow-sm cursor-pointer transition-all flex items-center justify-between ${
                      isExpanded 
                        ? 'bg-[var(--color-primary)] text-white border-[var(--color-primary)]' 
                        : 'bg-[var(--color-bg-light)] dark:bg-[var(--color-bg-dark)] border-gray-100 dark:border-gray-700 text-[var(--color-text-main-light)] dark:text-[var(--color-text-main-dark)]'
                    }`}
                  >
                    <span className="text-xs font-bold truncate">
                      {cliente.nome?.split(' ')[0] || "Sem Nome"}
                    </span>
                    {terapiasContratadas.length > 0 && <div className={`w-2 h-2 rounded-full ${isExpanded ? 'bg-white' : 'bg-[var(--color-primary)]'}`}></div>}
                  </div>
                  
                  {isExpanded && (
                    <div className="flex flex-col gap-2 mt-1 animate-in fade-in zoom-in-95 duration-200">
                      {terapiasContratadas.length > 0 ? (
                        terapiasContratadas.map((tc, idx) => (
                          <div 
                            key={`${tc.pacoteId}-${tc.itemPacoteId}-${idx}`}
                            draggable={tc.restante > 0 && !isMobile}
                            onDragStart={(e) => {
                              if (tc.restante <= 0) { e.preventDefault(); return; }
                              e.stopPropagation();
                              isDragging.current = true;
                              const target = e.currentTarget;
                              setTimeout(() => {
                                target.style.opacity = '0.4';
                                target.style.transform = 'scale(1.05)';
                                target.style.boxShadow = '0 10px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.1)';
                              }, 0);
                              handleDragStart(e, {
                                id: tc.terapiaId,
                                type: 'terapia',
                                clienteId: cliente.id,
                                terapiaId: tc.terapiaId,
                                pacoteId: tc.pacoteId,
                                itemPacoteId: tc.itemPacoteId,
                                name: cliente.nome || 'Cliente',
                                time: 'Novo'
                              });
                            }}
                            onDragEnd={(e) => {
                              e.stopPropagation();
                              isDragging.current = false;
                              setDraggingId(null);
                              e.currentTarget.style.opacity = '1';
                              e.currentTarget.style.transform = 'scale(1)';
                              e.currentTarget.style.boxShadow = 'none';
                            }}
                            style={{ userSelect: 'none', touchAction: 'none' }}
                            className={`px-3 py-2.5 rounded-xl border text-[10px] font-black flex justify-between items-center transition-all ${
                              tc.restante > 0 
                                ? 'bg-white dark:bg-gray-800 border-[var(--color-primary)]/20 text-[var(--color-primary)] cursor-grab active:cursor-grabbing hover:shadow-md' 
                                : 'bg-gray-100 dark:bg-gray-900 border-transparent text-gray-400 opacity-50 grayscale cursor-not-allowed'
                            }`}
                          >
                            <span className="truncate mr-2">{tc.nome}</span>
                            <span className={`px-1.5 rounded-md ${tc.restante > 0 ? 'bg-[var(--color-primary)]/10' : 'bg-gray-200'}`}>{tc.restante}/{tc.total}</span>
                          </div>
                        ))
                      ) : (
                        <div className="px-3 py-4 rounded-xl border border-dashed border-gray-300 dark:border-gray-700 text-[10px] text-center text-gray-400 italic">
                          Sem sessões disponíveis
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* Sessões Disponíveis (Drop Zone) */}
          <div className="mt-6">
            <div className="flex justify-between items-center mb-3">
              <h3 className="text-[10px] font-black text-[var(--color-primary)] uppercase tracking-widest flex items-center gap-2">
                <Trash2 size={14} /> Solte aqui para desmarcar (Sessões Disponíveis)
              </h3>
            </div>
            
            <div 
              onDragOver={handleDragOver}
              onDrop={handleDropToFooter}
              className="p-4 rounded-3xl border-2 border-dashed border-[var(--color-primary)]/20 bg-[var(--color-primary)]/5 min-h-[100px] transition-all hover:bg-[var(--color-primary)]/10"
            >
              <div className="flex overflow-x-auto gap-3 pb-2 no-scrollbar">
                {(() => {
                  const pacotesIds = new Set((pacotes || []).map(p => p.id));
                  return (agendamentos || [])
                    .filter(a => a.statusAtendimento === 'Disponivel' && pacotesIds.has(a.pacoteId || ''))
                    .map(ag => {
                      const cliente = (clientes || []).find(c => c.id === ag.clienteId);
                      const terapia = (terapias || []).find(t => t.id === ag.terapiaId);
                      return (
                        <div 
                          key={ag.id}
                          draggable={true}
                          onDragStart={(e) => {
                            e.stopPropagation();
                            isDragging.current = true;
                            handleDragStart(e, {
                              id: ag.id,
                              type: 'agendamento',
                              name: cliente?.nome || 'Cliente',
                              time: 'Reagendar'
                            });
                          }}
                          onDragEnd={(e) => {
                            e.stopPropagation();
                            isDragging.current = false;
                            setDraggingId(null);
                          }}
                          className="bg-white dark:bg-gray-800 p-2 rounded-xl border border-[var(--color-primary)]/30 shadow-sm shrink-0 min-w-[120px] cursor-grab active:cursor-grabbing"
                        >
                          <p className="text-[10px] font-bold truncate">{cliente?.nome}</p>
                          <p className="text-[8px] opacity-60 truncate">{terapias?.find(t => t.id === ag.terapiaId)?.nome}</p>
                        </div>
                      );
                    });
                })()}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Drag Preview (Hidden) */}
      <div 
        ref={dragPreviewRef}
        className="fixed -top-full left-0 p-4 bg-gradient-to-br from-[var(--color-primary)] to-indigo-600 text-white rounded-2xl shadow-[0_20px_50px_rgba(0,0,0,0.4)] flex flex-col gap-1.5 min-w-[180px] pointer-events-none z-[-1] border border-white/40 backdrop-blur-md scale-110"
      >
        <div className="flex items-center gap-2 mb-1">
          <div className="w-3 h-3 rounded-full bg-white animate-pulse shadow-[0_0_10px_white]"></div>
          <span className="preview-name text-base font-black truncate tracking-tight">Cliente</span>
        </div>
        <div className="flex items-center gap-2 bg-white/30 px-3 py-1.5 rounded-xl w-fit border border-white/20">
          <Clock size={14} className="text-white" />
          <span className="preview-time text-xs font-black tracking-wider">00:00</span>
        </div>
      </div>

      {/* Modal Novo Atendimento */}
      {isModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-md p-0 sm:p-4">
          <div className="bg-[var(--color-bg-light)] dark:bg-[var(--color-bg-dark)] w-full max-w-md rounded-t-[3rem] sm:rounded-[2.5rem] p-8 shadow-2xl animate-in slide-in-from-bottom duration-300 max-h-[92vh] overflow-y-auto relative">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-black text-[var(--color-text-main-light)] dark:text-[var(--color-text-main-dark)] tracking-tighter">
                Agendar <span className="text-[var(--color-primary)]">Sessão</span>
              </h2>
              <button onClick={() => setIsModalOpen(false)} className="bg-gray-100 dark:bg-gray-800 p-2 rounded-full transition-transform active:scale-90">
                <X size={24} className="text-[var(--color-text-sec-light)]" />
              </button>
            </div>

            {errorMessage && (
              <div className="mb-6 p-4 bg-[var(--color-error)]/10 border-l-4 border-[var(--color-error)] rounded-r-xl flex items-center gap-3">
                <AlertCircle size={20} className="text-[var(--color-error)] shrink-0" />
                <p className="text-xs text-[var(--color-error)] font-bold">{errorMessage}</p>
              </div>
            )}

            <div className="space-y-5 pb-8">
              <div className="bg-gray-50 dark:bg-gray-800/50 p-4 rounded-2xl border border-gray-100 dark:border-gray-800">
                <label className="block text-[10px] font-black uppercase tracking-widest text-[var(--color-text-sec-light)] mb-2">Cliente</label>
                {formClienteId ? (
                  <div className="text-lg font-bold text-[var(--color-primary)]">
                    {(clientes || []).find(c => c.id === formClienteId)?.nome || "Cliente"}
                  </div>
                ) : (
                  <select value={formClienteId} onChange={e => setFormClienteId(e.target.value)} className="w-full bg-transparent font-bold text-sm outline-none cursor-pointer">
                    <option value="">Selecione um cliente</option>
                    {(clientes || []).map(c => <option key={c.id} value={c.id}>{c.nome}</option>)}
                  </select>
                )}
              </div>

              <div>
                <label className="block text-[10px] font-black uppercase tracking-widest text-[var(--color-text-sec-light)] mb-3">Terapias Selecionadas</label>
                <div className="space-y-2 mb-3">
                  {formTerapiaIds.map((tid, index) => {
                    const t = (terapias || []).find(x => x.id === tid);
                    return (
                      <div key={`${tid}-${index}`} className="flex items-center justify-between bg-[var(--color-surface-light)] dark:bg-[var(--color-surface-dark)] px-4 py-3 rounded-2xl border border-[var(--color-primary)]/10 shadow-sm">
                        <span className="text-sm font-bold">{t?.nome || "Terapia"} <span className="text-xs font-normal opacity-60 ml-1">({t?.duracao || 0}m)</span></span>
                        <button 
                          onClick={() => {
                            const newIds = [...formTerapiaIds];
                            newIds.splice(index, 1);
                            setFormTerapiaIds(newIds);
                          }}
                          className="bg-red-50 dark:bg-red-900/20 text-red-500 p-1.5 rounded-lg"
                        >
                          <X size={16} />
                        </button>
                      </div>
                    );
                  })}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="bg-gray-50 dark:bg-gray-800 p-4 rounded-2xl border border-gray-100 dark:border-gray-800">
                  <label className="block text-[10px] font-black uppercase tracking-widest text-[var(--color-text-sec-light)] mb-2">Data</label>
                  <input type="date" value={formData} onChange={e => setFormData(e.target.value)} className="w-full bg-transparent font-bold text-sm outline-none" />
                </div>
                <div className="bg-gray-50 dark:bg-gray-800 p-4 rounded-2xl border border-gray-100 dark:border-gray-800">
                  <label className="block text-[10px] font-black uppercase tracking-widest text-[var(--color-text-sec-light)] mb-2">Horário</label>
                  <input type="time" value={formHora} onChange={e => setFormHora(e.target.value)} className="w-full bg-transparent font-bold text-sm outline-none" />
                </div>
              </div>

              <div className="p-4 bg-[var(--color-primary)]/5 rounded-2xl border border-[var(--color-primary)]/10">
                <label className="flex items-center gap-3 cursor-pointer">
                  <input type="checkbox" checked={recorrencia} onChange={e => setRecorrencia(e.target.checked)} className="w-5 h-5 rounded-lg text-[var(--color-primary)] border-gray-300 focus:ring-[var(--color-primary)]" />
                  <span className="text-xs font-black uppercase tracking-tight text-[var(--color-text-main-light)] dark:text-[var(--color-text-main-dark)]">Habilitar Recorrência</span>
                </label>

                {recorrencia && (
                  <div className="grid grid-cols-2 gap-3 mt-4 animate-in slide-in-from-top-2 duration-200">
                    <div>
                      <label className="block text-[9px] font-black uppercase text-[var(--color-text-sec-light)] mb-1">Intervalo</label>
                      <select value={frequencia} onChange={e => setFrequencia(e.target.value as any)} className="w-full p-2 bg-white dark:bg-gray-700 rounded-xl text-xs font-bold outline-none shadow-sm">
                        <option value="semanal">Semanal</option>
                        <option value="quinzenal">Quinzenal</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-[9px] font-black uppercase text-[var(--color-text-sec-light)] mb-1">Repetir até</label>
                      <input type="date" value={dataFim} onChange={e => setDataFim(e.target.value)} className="w-full p-2 bg-white dark:bg-gray-700 rounded-xl text-xs font-bold outline-none shadow-sm" />
                    </div>
                  </div>
                )}
              </div>

              <button 
                onClick={handleSaveAgendamento}
                className="w-full py-5 mt-4 bg-[var(--color-primary)] text-white font-black text-sm uppercase tracking-[0.2em] rounded-[1.5rem] shadow-xl shadow-[var(--color-primary)]/20 hover:scale-[1.02] active:scale-[0.98] transition-all"
              >
                Confirmar Agendamento
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Agenda do Dia */}
      {isDayAgendaOpen && selectedDate && (
        <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-md p-0 sm:p-4">
          <div className="bg-[var(--color-bg-light)] dark:bg-[var(--color-bg-dark)] w-full max-w-md rounded-t-[3rem] sm:rounded-[2.5rem] p-8 shadow-2xl animate-in slide-in-from-bottom duration-300 max-h-[92vh] overflow-y-auto relative">
            <div className="flex justify-between items-center mb-6">
              <div>
                <h2 className="text-2xl font-black text-[var(--color-text-main-light)] dark:text-[var(--color-text-main-dark)] tracking-tighter">
                  Agenda do <span className="text-[var(--color-primary)]">Dia</span>
                </h2>
                <p className="text-sm font-medium text-[var(--color-text-sec-light)] mt-1">
                  {(() => {
                    const [y, m, d] = selectedDate.split('-').map(Number);
                    return new Date(y, m - 1, d).toLocaleDateString('pt-BR', { weekday: 'long', day: '2-digit', month: 'long' });
                  })()}
                </p>
              </div>
              <button onClick={() => setIsDayAgendaOpen(false)} className="bg-gray-100 dark:bg-gray-800 p-2 rounded-full transition-transform active:scale-90">
                <X size={24} className="text-[var(--color-text-sec-light)]" />
              </button>
            </div>

            <div className="space-y-4 pb-8">
              {(agendamentos || [])
                .filter(a => a.data === selectedDate && (a.statusAtendimento === 'Agendado' || a.statusAtendimento === 'Concluido'))
                .sort((a, b) => a.hora.localeCompare(b.hora))
                .map(ag => {
                  const cliente = (clientes || []).find(c => c.id === ag.clienteId);
                  const terapia = (terapias || []).find(t => t.id === ag.terapiaId);
                  const isConcluido = ag.statusAtendimento === 'Concluido';
                  const isPago = ag.statusPagamento === 'Pago' || !!ag.pacoteId;
                  const pagoViaPacote = !!ag.pacoteId;

                  return (
                    <div key={ag.id} className={`p-4 rounded-2xl border transition-all ${isConcluido ? 'bg-gray-50 dark:bg-gray-800/50 border-gray-200 dark:border-gray-800 opacity-70' : 'bg-white dark:bg-gray-800 border-[var(--color-primary)]/20 shadow-sm'}`}>
                      <div className="flex justify-between items-start mb-3">
                        <div>
                          <div className="flex items-center gap-2 mb-1">
                            <span className="text-lg font-black text-[var(--color-primary)]">{ag.hora}</span>
                            {isConcluido && <span className="bg-gray-200 text-gray-600 text-[10px] font-bold px-2 py-0.5 rounded-full uppercase">Concluído</span>}
                          </div>
                          <h3 className="font-bold text-[var(--color-text-main-light)] dark:text-[var(--color-text-main-dark)]">{cliente?.nome || 'Cliente'}</h3>
                          <p className="text-xs text-[var(--color-text-sec-light)]">{terapia?.nome || 'Terapia'}</p>
                        </div>
                        <div className="flex flex-col items-end gap-2">
                          <span className={`text-[10px] font-black px-2 py-1 rounded-md uppercase ${isPago ? 'bg-[var(--color-success)]/10 text-[var(--color-success)]' : 'bg-[var(--color-warning)]/10 text-[var(--color-warning)]'}`}>
                            {pagoViaPacote ? 'Pago via Pacote' : isPago ? 'Pago' : 'Pendente'}
                          </span>
                        </div>
                      </div>

                      <div className="flex gap-2 mt-4 pt-4 border-t border-gray-100 dark:border-gray-700">
                        {!isConcluido && (
                          <button 
                            onClick={() => handleCompleteAppointment(ag.id)}
                            className="flex-1 py-2 bg-[var(--color-primary)]/10 text-[var(--color-primary)] font-bold text-xs rounded-xl hover:bg-[var(--color-primary)]/20 transition-colors"
                          >
                            Concluir
                          </button>
                        )}
                        
                        {!isPago && !isConcluido && (
                          <button 
                            onClick={() => {
                              promptAction('Forma de Pagamento (PIX, Crédito, Débito, Transferência, Dinheiro):', 'PIX', (forma) => {
                                if (forma) {
                                  updateAgendamento({ ...ag, statusPagamento: 'Pago' });
                                  addTransacao({
                                    descricao: `Atendimento - ${cliente?.nome || 'Cliente'}`,
                                    valor: ag.valorCobrado || 0,
                                    data: new Date().toISOString().split('T')[0],
                                    status: 'Pago',
                                    agendamentoId: ag.id
                                  });
                                  showNotification('Pagamento registrado!', 'success');
                                }
                              }, { title: 'Registrar Pagamento', placeholder: 'PIX, Dinheiro, etc.' });
                            }}
                            className="flex-1 py-2 bg-[var(--color-success)]/10 text-[var(--color-success)] font-bold text-xs rounded-xl hover:bg-[var(--color-success)]/20 transition-colors"
                          >
                            Cobrar
                          </button>
                        )}

                        <button 
                          onClick={() => handleDeleteAgendamento(ag.id)}
                          className="p-2 bg-red-50 dark:bg-red-900/20 text-red-500 rounded-xl hover:bg-red-100 dark:hover:bg-red-900/40 transition-colors"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </div>
                  );
                })}

              {(agendamentos || []).filter(a => a.data === selectedDate && a.statusAtendimento !== 'Cancelado').length === 0 && (
                <div className="text-center py-8 text-[var(--color-text-sec-light)]">
                  <CalendarIcon size={48} className="mx-auto mb-3 opacity-20" />
                  <p className="text-sm font-medium">Nenhum agendamento para este dia.</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Modal de Bloqueios */}
      {isBloqueiosOpen && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center bg-black/60 backdrop-blur-md p-4">
          <div className="bg-[var(--color-bg-light)] dark:bg-[var(--color-bg-dark)] w-full max-w-md rounded-[2.5rem] p-8 shadow-2xl animate-in zoom-in duration-300 max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-black text-[var(--color-text-main-light)] dark:text-[var(--color-text-main-dark)] tracking-tighter">
                Bloqueios de <span className="text-[var(--color-error)]">Agenda</span>
              </h2>
              <button onClick={() => setIsBloqueiosOpen(false)} className="bg-gray-100 dark:bg-gray-800 p-2 rounded-full transition-transform active:scale-90">
                <X size={24} className="text-[var(--color-text-sec-light)]" />
              </button>
            </div>

            <div className="space-y-6">
              <div className="bg-red-50 dark:bg-red-900/10 p-5 rounded-3xl border border-red-100 dark:border-red-900/20">
                <h3 className="text-[10px] font-black uppercase tracking-widest text-red-500 mb-4">Novo Bloqueio</h3>
                <div className="space-y-4">
                  <div>
                    <label className="block text-[10px] font-black uppercase tracking-widest text-[var(--color-text-sec-light)] mb-2">Data</label>
                    <input 
                      type="date" 
                      value={blockData} 
                      onChange={e => setBlockData(e.target.value)}
                      className="w-full bg-white dark:bg-gray-800 p-3 rounded-xl font-bold text-sm outline-none border border-gray-100 dark:border-gray-700" 
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-black uppercase tracking-widest text-[var(--color-text-sec-light)] mb-2">Motivo</label>
                    <input 
                      type="text" 
                      placeholder="Ex: Feriado, Folga, Curso..."
                      value={blockMotivo} 
                      onChange={e => setBlockMotivo(e.target.value)}
                      className="w-full bg-white dark:bg-gray-800 p-3 rounded-xl font-bold text-sm outline-none border border-gray-100 dark:border-gray-700" 
                    />
                  </div>
                  <button 
                    onClick={() => {
                      if (!blockData) return showNotification('Selecione uma data', 'error');
                      addBloqueio({ data: blockData, motivo: blockMotivo });
                      setBlockData('');
                      setBlockMotivo('');
                      showNotification('Bloqueio adicionado!', 'success');
                    }}
                    className="w-full py-3 bg-red-500 text-white font-black text-xs uppercase tracking-widest rounded-xl shadow-lg shadow-red-500/20 active:scale-95 transition-transform"
                  >
                    Bloquear Data
                  </button>
                </div>
              </div>

              <div className="space-y-3">
                <h3 className="text-[10px] font-black uppercase tracking-widest text-[var(--color-text-sec-light)] mb-2">Bloqueios Ativos</h3>
                {(bloqueios || []).length > 0 ? (
                  (bloqueios || []).sort((a, b) => a.data.localeCompare(b.data)).map(b => (
                    <div key={b.id} className="flex items-center justify-between bg-white dark:bg-gray-800 p-4 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm">
                      <div>
                        <div className="text-sm font-black text-red-500">{new Date(b.data + 'T12:00:00').toLocaleDateString('pt-BR')}</div>
                        <div className="text-[10px] font-bold text-[var(--color-text-sec-light)]">{b.motivo || 'Bloqueio de Agenda'}</div>
                      </div>
                      <button 
                        onClick={() => {
                          confirmAction('Deseja remover este bloqueio?', () => {
                            deleteBloqueio(b.id);
                            showNotification('Bloqueio removido!', 'success');
                          });
                        }}
                        className="p-2 bg-red-50 dark:bg-red-900/20 text-red-500 rounded-lg"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  ))
                ) : (
                  <div className="text-center py-6 text-[var(--color-text-sec-light)] italic text-xs">Nenhum bloqueio ativo</div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}