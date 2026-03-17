import React, { useState, useEffect, useRef } from 'react';
import { ChevronLeft, ChevronRight, Plus, Calendar as CalendarIcon, ShieldAlert, X, GripVertical, Clock, AlertCircle, CheckCircle2, Calendar } from 'lucide-react';
import { Cliente, Terapia, Agendamento, Bloqueio, Pacote } from '../types';
import { StorageService } from '../utils/storage';
import { useAppContext } from '../AppContext';
import { DropZoneRetorno } from '../components/DropZoneRetorno';

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
    addTransacao
  } = useAppContext();
  
  // State
  const [currentMonth, setCurrentMonth] = useState(new Date());
  
  // UI State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isBloqueiosOpen, setIsBloqueiosOpen] = useState(false);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [isDayAgendaOpen, setIsDayAgendaOpen] = useState(false);
  const [showOrfaos, setShowOrfaos] = useState(false);
  const [expandedWeekIndex, setExpandedWeekIndex] = useState<number | null>(null);
  const [expandedClienteId, setExpandedClienteId] = useState<string | null>(null);
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const dragPreviewRef = useRef<HTMLDivElement>(null);
  const longPressTimer = useRef<NodeJS.Timeout | null>(null);

  // Form State - Agendamento
  const [formClienteId, setFormClienteId] = useState('');
  const [activePackage, setActivePackage] = useState<Pacote | null>(null);

  useEffect(() => {
    if (formClienteId) {
      const active = pacotes.find(p => p.clienteId === formClienteId);
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

  const year = currentMonth.getFullYear();
  const month = currentMonth.getMonth();
  const daysInMonth = getDaysInMonth(year, month);
  const firstDay = getFirstDayOfMonth(year, month);
  const monthName = new Intl.DateTimeFormat('pt-BR', { month: 'long' }).format(currentMonth);

  // Handlers
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    e.dataTransfer.dropEffect = 'move';
  };

  const handleDragStart = (e: React.DragEvent, data: { id?: string; clienteId?: string; terapiaId?: string; pacoteId?: string; itemPacoteId?: string; name: string; time: string }) => {
    e.dataTransfer.effectAllowed = 'move';
    if (data.id) e.dataTransfer.setData('agendamentoId', String(data.id));
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
      
      // Create a ghost image
      preview.style.opacity = '0.7';
      e.dataTransfer.setDragImage(preview, 40, 20);
    }
  };

  const handleDropRetorno = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const agendamentoId = e.dataTransfer.getData('agendamentoId');
    if (!agendamentoId) return;

    const agendamento = agendamentos.find(a => String(a.id) === String(agendamentoId));
    if (!agendamento) return;

    // Se for pacote, incrementa
    if (agendamento.pacoteId) {
      setPacotes(prev => prev.map(p => {
        if (String(p.id) === String(agendamento.pacoteId)) {
          const updatedItens = p.itens.map((item) => {
            if (String(item.terapiaId) === String(agendamento.terapiaId)) {
              return { ...item, quantidadeRestante: (item.quantidadeRestante || 0) + 1 };
            }
            return item;
          });
          return { ...p, itens: updatedItens };
        }
        return p;
      }));
    }

    // Remove do calendário
    setAgendamentos(prev => prev.filter(a => String(a.id) !== String(agendamentoId)));
    showNotification("Sessão devolvida ao pacote do cliente", "info");
  };

  const handleDrop = (e: React.DragEvent, day: number) => {
    e.preventDefault();
    e.stopPropagation();
    console.log('Drop event triggered on day:', day);
    
    // Cleanup drag preview if needed (though browser usually handles this)
    if (dragPreviewRef.current) {
      dragPreviewRef.current.style.top = '-1000px';
    }

    const agendamentoId = e.dataTransfer.getData('agendamentoId');
    const clienteId = e.dataTransfer.getData('clienteId');
    const terapiaId = e.dataTransfer.getData('terapiaId');
    const pacoteId = e.dataTransfer.getData('pacoteId');
    const itemPacoteId = e.dataTransfer.getData('itemPacoteId');
    const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;

    console.log('Drop data:', { agendamentoId, clienteId, terapiaId, pacoteId, itemPacoteId, dateStr });

    if (agendamentoId) {
      const itemToUpdate = agendamentos.find(a => String(a.id) === String(agendamentoId));
      
      if (itemToUpdate) {
        // Optimistic UI: Update local state immediately
        const updatedItem = { ...itemToUpdate, data: dateStr };
        updateAgendamento(updatedItem);
        
        showNotification('Agendamento reagendado!', 'success');
      }
      return;
    }

    if (clienteId && terapiaId) {
      setFormClienteId(clienteId);
      setFormData(dateStr);
      setFormTerapiaIds([terapiaId]);
      setFormPacoteId(pacoteId || undefined);
      setFormItemPacoteId(itemPacoteId || undefined);
      const terapia = terapias.find(t => t.id === terapiaId);
      setFormValor(terapia?.valor || 0);
      setFormHora('09:00');
      setIsModalOpen(true);
    }
  };

  const handleSaveAgendamento = async () => {
    if (!formClienteId || formTerapiaIds.length === 0 || !formData || !formHora) {
      setErrorMessage('Preencha todos os campos obrigatórios.');
      return;
    }

    const selectedTerapias = formTerapiaIds.map(tid => terapias.find(t => t.id === tid)).filter(Boolean) as Terapia[];
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

    const saveAll = (formaPagamento?: string) => {
      const newAgendamentos: Agendamento[] = [];

      for (let d of datesToSchedule) {
        const agendamentoId = crypto.randomUUID();
        const newAgendamento: Agendamento = {
          id: agendamentoId,
          clienteId: formClienteId,
          terapiaId: formTerapiaIds[0],
          data: d,
          hora: formHora,
          pacoteId: formPacoteId,
          statusPagamento: formStatusPagamento,
          statusAtendimento: 'Agendado',
          valorCobrado: Number(formValor)
        };
        newAgendamentos.push(newAgendamento);
      }

      // Handle package updates if applicable
      if (formPacoteId && formItemPacoteId) {
        setPacotes(prev => prev.map(p => {
          if (p.id === formPacoteId) {
            const updatedItens = p.itens.map((item) => {
              if (item.id === formItemPacoteId) {
                return { ...item, quantidadeRestante: Math.max(0, Number(item.quantidadeRestante || 0) - datesToSchedule.length) };
              }
              return item;
            });
            return { ...p, itens: updatedItens };
          }
          return p;
        }));
      }

      // Update Agendamentos
      setAgendamentos(prev => [...prev, ...newAgendamentos]);

      // Handle Transactions if Paid
      if (formStatusPagamento === 'Pago') {
        const cliente = clientes.find(c => String(c.id) === String(formClienteId));
        const clienteNome = cliente?.nome || 'Cliente';
        addTransacao({
          descricao: `Atendimento - ${clienteNome}`,
          valor: Number(formValor) * datesToSchedule.length,
          data: new Date().toISOString().split('T')[0],
          status: 'Pago'
        });
      }

      setIsModalOpen(false);
      showNotification('Agendado com sucesso!', 'success');
    };

    if (formStatusPagamento === 'Pago') {
      promptAction('Forma de Pagamento (PIX, Crédito, Débito, Transferência, Dinheiro):', 'PIX', async (forma) => {
        if (forma) {
          await saveAll(forma);
        }
      }, { title: 'Registrar Pagamento', placeholder: 'PIX, Dinheiro, etc.' });
    } else {
      await saveAll();
    }
  };

  const handleDeleteAgendamento = (agendamentoId: string) => {
    confirmAction('Deseja realmente excluir este agendamento?', () => {
      const agendamento = agendamentos.find(a => String(a.id) === String(agendamentoId));
      
      if (agendamento?.pacoteId) {
        setPacotes(prev => prev.map(p => {
          if (String(p.id) === String(agendamento.pacoteId)) {
            const updatedItens = p.itens.map((item) => {
              if (String(item.terapiaId) === String(agendamento.terapiaId)) {
                return { ...item, quantidadeRestante: (item.quantidadeRestante || 0) + 1 };
              }
              return item;
            });
            return { ...p, itens: updatedItens };
          }
          return p;
        }));
      }

      setAgendamentos(prev => prev.filter(a => String(a.id) !== String(agendamentoId)));
      showNotification('Agendamento excluído!', 'success');
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

  // Long Press logic for dragging existing appointments
  const startLongPress = (id: string) => {
    longPressTimer.current = setTimeout(() => {
      // Logic for starting drag if needed via state
    }, 500);
  };

  return (
    <div className="flex flex-col h-full relative bg-[var(--color-bg-light)] dark:bg-[var(--color-bg-dark)]">
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
            {clientes.map(cliente => {
              const clientePacotes = pacotes.filter(p => p.clienteId === cliente.id);
              const orfaos = clientePacotes.flatMap(p => {
                return p.itens.filter(item => Number(item.quantidadeRestante || 0) > 0).map(item => ({
                  pacoteId: p.id,
                  itemPacoteId: item.id,
                  terapiaId: item.terapiaId,
                  nome: terapias.find(t => t.id === item.terapiaId)?.nome || 'Desconhecida',
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
                        draggable
                        onDragStart={(e) => handleDragStart(e, {
                          clienteId: cliente.id,
                          terapiaId: o.terapiaId,
                          pacoteId: o.pacoteId,
                          itemPacoteId: o.itemPacoteId,
                          name: cliente.nome || 'Cliente',
                          time: 'Novo'
                        })}
                        className="flex justify-between items-center gap-2 cursor-grab active:cursor-grabbing bg-orange-50 dark:bg-orange-900/20 p-1 rounded"
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
      <DropZoneRetorno onDrop={handleDropRetorno} onDragOver={handleDragOver} />
      <div className="flex-1 overflow-y-auto p-4 pb-52 scrollbar-hide">
        <div className="grid grid-cols-7 gap-1 mb-2">
          {['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'].map(d => (
            <div key={d} className="text-center text-[10px] font-black uppercase tracking-tighter text-[var(--color-text-sec-light)] dark:text-[var(--color-text-sec-dark)] py-2">
              {d}
            </div>
          ))}
        </div>
        
        <div className="space-y-1">
          {(() => {
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
              const isExpanded = expandedWeekIndex === weekIdx;
              return (
                <div key={weekIdx} className={`grid grid-cols-7 gap-1 transition-all duration-300 ${isExpanded ? 'min-h-max' : 'h-auto'}`}>
                  {week.map((day, dayIdx) => {
                    if (day === null) return <div key={`empty-${weekIdx}-${dayIdx}`} className="aspect-square opacity-20" />;
                    
                    const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
                    const dayAgendamentos = agendamentos
                      .filter(a => a.data === dateStr && a.statusAtendimento !== 'Cancelado')
                      .sort((a, b) => a.hora.localeCompare(b.hora));
                    const hasBloqueio = bloqueios.some(b => b.data === dateStr);
                    const isToday = new Date().toISOString().startsWith(dateStr);

                    return (
                      <div 
                        key={day} 
                        onClick={(e) => {
                          e.stopPropagation();
                          if (dayAgendamentos.length > 1) {
                            setExpandedWeekIndex(isExpanded ? null : weekIdx);
                          } else {
                            openDayAgenda(day);
                          }
                        }}
                        onDragOver={handleDragOver}
                        onDrop={(e) => handleDrop(e, day)}
                        className={`min-h-[65px] rounded-xl flex flex-col p-1.5 relative cursor-pointer transition-all border ${
                          isToday 
                            ? 'bg-[var(--color-primary)]/5 border-[var(--color-primary)]' 
                            : 'bg-[var(--color-surface-light)] dark:bg-[var(--color-surface-dark)] border-gray-100 dark:border-gray-800'
                        } ${isExpanded ? 'h-auto shadow-lg ring-1 ring-primary' : 'aspect-square overflow-hidden'}`}
                      >
                        <div className="flex justify-between items-center mb-1">
                          <span className={`text-[11px] font-black ${isToday ? 'text-[var(--color-primary)]' : 'text-[var(--color-text-sec-light)] opacity-50'}`}>{day}</span>
                          {hasBloqueio && <ShieldAlert size={10} className="text-[var(--color-error)]" />}
                        </div>

                        <div className="flex flex-col gap-1">
                          {isExpanded ? (
                            dayAgendamentos.map(ag => {
                              const cliente = clientes.find(c => c.id === ag.clienteId);
                              const isRealizado = ag.statusAtendimento === 'Realizado';
                              return (
                                <div 
                                  key={ag.id}
                                  draggable
                                  onDragStart={(e) => {
                                    e.stopPropagation();
                                    handleDragStart(e, {
                                      id: ag.id,
                                      name: cliente?.nome || 'Cliente',
                                      time: ag.hora
                                    });
                                  }}
                                  className={`text-[9px] p-1 rounded border leading-tight ${
                                    isRealizado ? 'bg-gray-100 text-gray-400' : 'bg-white dark:bg-gray-700 text-[var(--color-primary)] border-[var(--color-primary)]/30'
                                  }`}
                                >
                                  <div className="flex justify-between items-center font-black">
                                    <span>{ag.hora}</span>
                                    {isRealizado && <CheckCircle2 size={8} />}
                                  </div>
                                  <div className="truncate">{cliente?.nome?.split(' ')[0]}</div>
                                </div>
                              );
                            })
                          ) : (
                            dayAgendamentos.length > 0 && (
                              <>
                                <div className="text-[9px] px-1 py-0.5 rounded bg-[var(--color-primary)] text-white font-bold leading-tight truncate">
                                  {clientes.find(c => c.id === dayAgendamentos[0].clienteId)?.nome?.split(' ')[0]}
                                </div>
                                {dayAgendamentos.length > 1 && (
                                  <div className="text-[8px] font-black text-[var(--color-primary)] mt-0.5 bg-[var(--color-primary)]/10 px-1 rounded-sm w-fit">
                                    +{dayAgendamentos.length - 1}
                                  </div>
                                )}
                              </>
                            )
                          )}
                        </div>
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
      <div className="absolute bottom-0 left-0 right-0 bg-[var(--color-surface-light)] dark:bg-[var(--color-surface-dark)] border-t border-gray-200 dark:border-gray-800 p-4 pb-10 shadow-[0_-15px_30px_-5px_rgba(0,0,0,0.15)] z-20 rounded-t-[2.5rem]">
        <div className="w-12 h-1.5 bg-gray-300 dark:bg-gray-700 rounded-full mx-auto mb-4 opacity-50"></div>
        <h3 className="text-[10px] font-black text-[var(--color-text-sec-light)] dark:text-[var(--color-text-sec-dark)] uppercase tracking-widest mb-4 flex items-center justify-center gap-2">
          <GripVertical size={14} className="animate-pulse" /> Arraste a terapia para agendar
        </h3>
        <div className="flex overflow-x-auto pb-4 gap-3 snap-x scroll-smooth no-scrollbar">
          {clientes.filter(cliente => pacotes.some(p => p.clienteId === cliente.id)).map(cliente => {
            const isExpanded = expandedClienteId === cliente.id;
            const clientePacotes = pacotes.filter(p => p.clienteId === cliente.id);
            const terapiasContratadas = clientePacotes.flatMap(p => {
              return p.itens.map(item => ({
                pacoteId: p.id,
                itemPacoteId: item.id,
                terapiaId: item.terapiaId,
                nome: terapias.find(t => t.id === item.terapiaId)?.nome || 'Desconhecida',
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
                          draggable={tc.restante > 0}
                          onDragStart={(e) => {
                            if (tc.restante <= 0) { e.preventDefault(); return; }
                            handleDragStart(e, {
                              clienteId: cliente.id,
                              terapiaId: tc.terapiaId,
                              pacoteId: tc.pacoteId,
                              itemPacoteId: tc.itemPacoteId,
                              name: cliente.nome || 'Cliente',
                              time: 'Novo'
                            });
                          }}
                          className={`px-3 py-2.5 rounded-xl border text-[10px] font-black flex justify-between items-center transition-all ${
                            tc.restante > 0 
                              ? 'bg-white dark:bg-gray-800 border-[var(--color-primary)]/20 text-[var(--color-primary)] cursor-grab active:cursor-grabbing' 
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
      </div>

      {/* Drag Preview (Hidden) */}
      <div 
        ref={dragPreviewRef}
        className="fixed -top-full left-0 p-3 bg-[var(--color-primary)] text-white rounded-xl shadow-2xl flex flex-col gap-1 min-w-[140px] pointer-events-none z-[-1] border border-white/20"
      >
        <span className="preview-name text-sm font-bold truncate">Cliente</span>
        <div className="flex items-center gap-2 opacity-90">
          <Clock size={12} />
          <span className="preview-time text-xs font-medium">00:00</span>
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
                <div className="text-lg font-bold text-[var(--color-primary)]">
                  {clientes.find(c => c.id === formClienteId)?.nome || "Cliente"}
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-black uppercase tracking-widest text-[var(--color-text-sec-light)] mb-3">Terapias Selecionadas</label>
                <div className="space-y-2 mb-3">
                  {formTerapiaIds.map((tid, index) => {
                    const t = terapias.find(x => x.id === tid);
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

              <div className="grid grid-cols-2 gap-4">
                <div className="bg-gray-50 dark:bg-gray-800 p-4 rounded-2xl border border-gray-100 dark:border-gray-800">
                  <label className="block text-[10px] font-black uppercase tracking-widest text-[var(--color-text-sec-light)] mb-2">Valor Total</label>
                  <div className="flex items-center gap-1 font-black text-[var(--color-success)]">
                    <span>R$</span>
                    <input type="number" step="0.01" value={formValor} onChange={e => setFormValor(parseFloat(e.target.value) || 0)} className="w-full bg-transparent outline-none" />
                  </div>
                </div>
                <div className="bg-gray-50 dark:bg-gray-800 p-4 rounded-2xl border border-gray-100 dark:border-gray-800">
                  <label className="block text-[10px] font-black uppercase tracking-widest text-[var(--color-text-sec-light)] mb-2">Pagamento</label>
                  <select value={formStatusPagamento} onChange={e => setFormStatusPagamento(e.target.value as any)} className="w-full bg-transparent font-bold text-sm outline-none cursor-pointer">
                    <option value="Pendente">🔴 Pendente</option>
                    <option value="Pago">🟢 Pago</option>
                  </select>
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
    </div>
  );
}