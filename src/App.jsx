import { useEffect, useMemo, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import {
  ArrowLeft, ArrowRight, ArrowCounterClockwise, Bank, Bell, CalendarBlank,
  CaretDown, ChatCircleText, Check, CheckCircle, CircleNotch, Clock, Copy,
  DeviceMobile, DownloadSimple, FileText, Flag, Footprints, Globe, Headphones, Headset, House,
  IdentificationCard, ImageSquare, Info, ListChecks, LockKey, MagnifyingGlass, Package, PaperPlaneTilt, Phone,
  PencilSimple, Plus, Question, Receipt, SealCheck, Shield, ShieldCheck, SignOut, SpinnerGap, GearSix,
  Storefront, Truck, UploadSimple, User, UsersThree, Wallet, WarningCircle, X,
} from "@phosphor-icons/react";
import "@fontsource-variable/inter";
import { AdminApp } from "./AdminApp";
import { createProtectedTransaction, loginAccount, logoutAccount, registerAccount, restoreAccount } from "./lib/proofpay-api";

const navItems = [
  { id: "home", label: "Home", icon: House },
  { id: "create", label: "Create payment", icon: ShieldCheck },
  { id: "transactions", label: "Transactions", icon: Receipt },
  { id: "disputes", label: "Disputes", icon: Flag },
  { id: "messages", label: "Messages", icon: ChatCircleText },
  { id: "agents", label: "Agents", icon: UsersThree },
  { id: "settings", label: "Settings", icon: GearSix },
];

const transactions = [
  { name: "Blender", seller: "Ama Store", amount: "GHS 300.00", date: "22 Aug 2026", status: "Protected", icon: DeviceMobile, tone: "green" },
  { name: "Wireless Headset", seller: "Tech Junction", amount: "GHS 150.00", date: "18 Aug 2026", status: "Completed", icon: Headphones, tone: "blue" },
  { name: "Canvas Sneakers", seller: "Urban Kicks", amount: "GHS 250.00", date: "12 Aug 2026", status: "Cancelled", icon: Footprints, tone: "amber" },
];

const historyTransactions = [
  { ref: "PP-260822-9X7L", item: "Blender", buyer: "Kojo Mensah", seller: "Ama Store", amount: 300, fee: 4.50, date: "22 Aug 2026", dateKey: "2026-08-22", status: "Protected", channel: "MTN MoMo" },
  { ref: "PP-260819-7F2M", item: "Website design milestone", buyer: "Kojo Mensah", seller: "PixelCraft Studio", amount: 450, fee: 6.75, date: "19 Aug 2026", dateKey: "2026-08-19", status: "Released", channel: "Bank account" },
  { ref: "PP-260818-4A1P", item: "Wireless Headset", buyer: "Kojo Mensah", seller: "Tech Junction", amount: 150, fee: 2.25, date: "18 Aug 2026", dateKey: "2026-08-18", status: "Released", channel: "Telecel Cash" },
  { ref: "PP-260812-3K8N", item: "Canvas Sneakers", buyer: "Kojo Mensah", seller: "Urban Kicks", amount: 250, fee: 3.75, date: "12 Aug 2026", dateKey: "2026-08-12", status: "Refunded", channel: "MTN MoMo" },
  { ref: "PP-260805-6B4Q", item: "Farm supplies", buyer: "Kojo Mensah", seller: "Green Field Co-op", amount: 620, fee: 9.30, date: "05 Aug 2026", dateKey: "2026-08-05", status: "Released", channel: "AT Money" },
  { ref: "PP-260728-2D5R", item: "Catering deposit", buyer: "Kojo Mensah", seller: "Akwaaba Kitchen", amount: 180, fee: 0, date: "28 Jul 2026", dateKey: "2026-07-28", status: "Cancelled", channel: "MTN MoMo" },
];

const progressStages = [
  { id: "agreed", label: "Terms agreed", detail: "22 Aug, 10:15 AM" },
  { id: "protected", label: "Payment protected", detail: "In progress" },
  { id: "delivered", label: "Delivered", detail: "Pending" },
  { id: "released", label: "Release", detail: "Pending" },
];
const stageOrder = { agreed: 0, protected: 1, delivered: 2, released: 3, disputed: 2 };
const spring = { type: "spring", stiffness: 380, damping: 31 };

function AppButton({ children, variant = "primary", icon: Icon, className = "", ...props }) {
  return <motion.button whileHover={{ y: -1 }} whileTap={{ scale: 0.975 }} transition={spring} className={`button button--${variant} ${className}`} {...props}>{Icon && <Icon size={20} />}<span>{children}</span></motion.button>;
}

function Sidebar({ view, setView, openModal, onLogout }) {
  const select = (id) => id === "create" ? openModal("create") : setView(id);
  return <aside className="sidebar">
    <div className="brand-lockup"><img src="/assets/proofpay-horizontal-dark.png" alt="ProofPay - Pay Safe. Pay Smart." /></div>
    <nav className="side-nav" aria-label="Main navigation">{navItems.map(({ id, label, icon: Icon }) => <motion.button key={id} className={`nav-item ${id === view ? "nav-item--active" : ""}`} onClick={() => select(id)} whileHover={{ x: 3 }} whileTap={{ scale: 0.98 }}><Icon size={24} /><span>{label}</span></motion.button>)}</nav>
    <button className="ussd-entry" onClick={() => openModal("ussd")}><Phone size={24} /><span><b>Use basic phone / USSD</b><small>*719#</small></span></button>
    <div className="sidebar-spacer" />
    <div className="sidebar-utility"><button className={view==="help"?"is-active":""} onClick={()=>setView("help")}><Headset size={24}/><span>Help & support</span></button><button onClick={onLogout}><SignOut size={24}/><span>Sign out</span></button></div>
  </aside>;
}

function Header({ onReset, openModal, onLogout, user }) {
  const firstName=user?.fullName?.trim().split(/\s+/)[0]||"Kojo";
  return <header className="topbar"><div><h1>Trust Command Center</h1><p>Welcome back, {firstName}.</p></div><div className="topbar-actions">
    <button className="top-link" onClick={onReset}><ArrowCounterClockwise size={18} /><span>Replay demo</span></button>
    <button className="top-link" onClick={() => openModal("language")}><Globe size={22} /><span>English (Ghana)</span><CaretDown size={16} /></button>
    <button className="top-link" onClick={() => openModal("help")}><Question size={22} /><span>Help</span></button>
    <button className="top-link top-link--desktop" onClick={onLogout}><SignOut size={22} /><span>Log out</span></button>
  </div></header>;
}

function ProgressTracker({ stage }) {
  const activeIndex = stageOrder[stage] ?? 1;
  return <div className="progress-tracker"><div className="progress-line"><motion.div className="progress-line__fill" animate={{ width: `${(activeIndex / 3) * 100}%` }} transition={{ duration: .7 }} /></div>{progressStages.map((item,index)=>{
    const complete = index < activeIndex || stage === "released"; const current = index === activeIndex && stage !== "released";
    let detail = item.detail;
    if(item.id === "protected" && activeIndex > 1) detail = "22 Aug, 10:16 AM";
    if(item.id === "delivered" && activeIndex >= 2) detail = "22 Aug, 1:05 PM";
    if(item.id === "released" && stage === "released") detail = "22 Aug, 1:10 PM";
    return <div className="progress-step" key={item.id}><motion.div className={`progress-dot ${complete?"is-complete":""} ${current?"is-current":""}`} animate={current?{scale:[1,1.09,1]}:{scale:1}} transition={current?{repeat:Infinity,duration:2.2}:{}}>{complete?<Check size={17} weight="bold"/>:index+1}</motion.div><b>{item.label}</b><span>{detail}</span></div>;
  })}</div>;
}

function ActiveTransaction({ stage, openModal }) {
  const status = stage === "released" ? "Released" : stage === "disputed" ? "On hold" : stage === "delivered" ? "Ready for inspection" : "Protected";
  return <motion.section className="active-card" layout>
    <div className="active-card__status"><motion.div className={`shield-orb ${stage==="disputed"?"shield-orb--warning":""}`} animate={stage==="protected"?{scale:[1,1.04,1]}:{scale:1}} transition={{repeat:stage==="protected"?Infinity:0,duration:2.6}}>{stage==="disputed"?<WarningCircle size={30} weight="fill"/>:<ShieldCheck size={33} weight="fill"/>}</motion.div><div><span className="eyebrow">ACTIVE TRANSACTION</span><h2>{status}</h2><p>{stage==="disputed"?"The payment is protected while the issue is reviewed.":stage==="released"?"The seller has received the approved payment.":"Your payment is secure with ProofPay."}</p></div><div className={`protection-chip ${stage==="disputed"?"protection-chip--warning":""}`}>{stage==="disputed"?<WarningCircle size={20}/>:<ShieldCheck size={20}/>} {stage==="disputed"?"Payment on hold":stage==="released"?"Released safely":"You’re protected"}</div></div>
    <div className="party-grid"><div className="party-cell"><span>Buyer</span><div className="party-person"><div className="round-icon round-icon--blue"><User size={24} weight="fill"/></div><b>Kojo Mensah</b></div></div><div className="party-cell party-cell--product"><img src="/assets/blender.png" alt="Black and silver blender"/><div><b>Blender</b><span>Ama Store</span></div></div><div className="party-cell"><span>Seller</span><div className="party-person"><div className="round-icon round-icon--green"><Storefront size={23} weight="fill"/></div><b>Ama Store</b></div></div></div>
    <div className="transaction-meta"><div><span>Amount</span><b>GHS 300.00</b></div><div><span>Delivery due</span><b className="green-text">Today, 22 Aug 2026</b></div><div><span>Transaction ID</span><b>PP-260822-9X7L <Copy size={16}/></b></div></div>
    <ProgressTracker stage={stage}/><div className="card-actions"><AppButton icon={ShieldCheck} onClick={()=>openModal("create")}>Create protected payment</AppButton><AppButton variant="secondary" icon={Truck} onClick={()=>openModal("track")}>Track transaction</AppButton><AppButton variant="secondary" icon={Flag} onClick={()=>openModal("dispute")}>Report a problem</AppButton></div>
  </motion.section>;
}

function RecentTransactions({ stage, openModal }) {
  const rows=useMemo(()=>transactions.map((item,index)=>index===0?{...item,status:stage==="released"?"Completed":stage==="disputed"?"On hold":stage==="delivered"?"Delivered":"Protected"}:item),[stage]);
  return <section className="panel"><div className="panel-heading"><h3>Recent transactions</h3><button onClick={()=>openModal("transactions")}>View all</button></div><div className="transaction-list">{rows.map(item=>{const Icon=item.icon;return <motion.button key={item.name} className="transaction-row" whileHover={{x:3}} onClick={()=>item.name==="Blender"&&openModal("track")}><span className={`product-icon product-icon--${item.tone}`}><Icon size={23}/></span><span className="transaction-row__name"><b>{item.name}</b><small>{item.seller}</small></span><span className="transaction-row__amount"><b>{item.amount}</b><small>{item.date}</small></span><span className={`status-pill status-pill--${item.status.toLowerCase().replace(" ","-")}`}>{item.status}</span><ArrowRight size={17}/></motion.button>})}</div></section>;
}

function TrustSummary(){const items=[{icon:ShieldCheck,title:"Protected payments",text:"Funds remain with a licensed partner until release."},{icon:UsersThree,title:"Verified participants",text:"Stronger checks help honest people trade with confidence."},{icon:Headset,title:"Support when you need it",text:"Our team can help when something goes wrong."}];return <section className="panel"><div className="panel-heading"><h3>Trust summary</h3><button>How it works</button></div><div className="trust-list">{items.map(({icon:Icon,title,text})=><div className="trust-row" key={title}><Icon size={28}/><div><b>{title}</b><span>{text}</span></div></div>)}</div></section>}

function HomeView({stage,openModal}){return <><ActiveTransaction stage={stage} openModal={openModal}/><div className="dashboard-grid"><RecentTransactions stage={stage} openModal={openModal}/><TrustSummary/></div><section className="assurance-bar"><div><ShieldCheck size={37}/><span><b>Safe. Simple. Secure.</b><small>ProofPay protects your transaction every step of the way.</small></span></div><div><CalendarBlank size={29}/><span><b>22 August 2026</b><small>Saturday</small></span></div><div><LockKey size={29}/><span><b>Your data is safe with us.</b><small>Security built into every action.</small></span></div><div><Headset size={29}/><span><b>Need help?</b><small className="link-text">Chat with us</small></span></div></section></>}

function TransactionsView({stage,openModal,onSelect}){
  const [query,setQuery]=useState(""),[statusFilter,setStatusFilter]=useState("All"),[period,setPeriod]=useState("All time");
  const rows=useMemo(()=>historyTransactions.map((item,index)=>index===0?{...item,status:stage==="released"?"Released":stage==="disputed"?"On hold":stage==="delivered"?"Ready to release":"Protected"}:item),[stage]);
  const visible=useMemo(()=>rows.filter(item=>{
    const text=`${item.item} ${item.seller} ${item.buyer} ${item.ref}`.toLowerCase();
    const matchesQuery=text.includes(query.trim().toLowerCase());
    const matchesStatus=statusFilter==="All"||item.status===statusFilter;
    const matchesPeriod=period==="All time"?true:period==="August 2026"?item.dateKey.startsWith("2026-08"):item.dateKey>="2026-08-18";
    return matchesQuery&&matchesStatus&&matchesPeriod;
  }),[rows,query,statusFilter,period]);
  const money=value=>`GHS ${value.toFixed(2)}`;
  const totals={protected:rows.filter(r=>["Protected","Ready to release","On hold"].includes(r.status)).reduce((sum,r)=>sum+r.amount,0),released:rows.filter(r=>r.status==="Released").reduce((sum,r)=>sum+r.amount,0),refunded:rows.filter(r=>r.status==="Refunded").reduce((sum,r)=>sum+r.amount,0),count:rows.length};
  const exportStatement=()=>{const header="Reference,Item,Seller,Amount,Fee,Status,Date\n";const body=visible.map(r=>`${r.ref},${r.item},${r.seller},${r.amount.toFixed(2)},${r.fee.toFixed(2)},${r.status},${r.date}`).join("\n");const url=URL.createObjectURL(new Blob([header+body],{type:"text/csv"}));const link=document.createElement("a");link.href=url;link.download="ProofPay-payment-history.csv";link.click();URL.revokeObjectURL(url)};
  const chooseStatus=value=>setStatusFilter(current=>current===value?"All":value);
  return <motion.section className="content-page payment-history-page" initial={{opacity:0,y:10}} animate={{opacity:1,y:0}}>
    <div className="page-title payment-history-title"><div><span className="eyebrow">PAYMENT ACTIVITY</span><h2>Payment history</h2><p>Find every protected payment, follow its status and open the complete transaction record.</p></div><div className="page-title-actions"><AppButton variant="secondary" icon={DownloadSimple} onClick={exportStatement}>Download statement</AppButton><AppButton icon={Plus} onClick={()=>openModal("create")}>Create payment</AppButton></div></div>
    <div className="history-summary" aria-label="Payment history summary">
      <button className={statusFilter==="Protected"?"is-selected":""} onClick={()=>chooseStatus("Protected")}><span className="history-summary-icon history-summary-icon--blue"><ShieldCheck size={22} weight="fill"/></span><span><small>CURRENTLY PROTECTED</small><b>{money(totals.protected)}</b><em>{rows.filter(r=>["Protected","Ready to release","On hold"].includes(r.status)).length} active payment</em></span></button>
      <button className={statusFilter==="Released"?"is-selected":""} onClick={()=>chooseStatus("Released")}><span className="history-summary-icon history-summary-icon--green"><CheckCircle size={22} weight="fill"/></span><span><small>RELEASED</small><b>{money(totals.released)}</b><em>{rows.filter(r=>r.status==="Released").length} successful payments</em></span></button>
      <button className={statusFilter==="Refunded"?"is-selected":""} onClick={()=>chooseStatus("Refunded")}><span className="history-summary-icon history-summary-icon--amber"><ArrowCounterClockwise size={22} weight="fill"/></span><span><small>REFUNDED</small><b>{money(totals.refunded)}</b><em>{rows.filter(r=>r.status==="Refunded").length} returned payment</em></span></button>
      <button className={statusFilter==="All"?"is-selected":""} onClick={()=>setStatusFilter("All")}><span className="history-summary-icon history-summary-icon--navy"><Receipt size={22} weight="fill"/></span><span><small>TOTAL RECORDS</small><b>{totals.count}</b><em>Across all statuses</em></span></button>
    </div>
    <div className="history-toolbar"><label className="history-search"><MagnifyingGlass size={19}/><input value={query} onChange={e=>setQuery(e.target.value)} aria-label="Search payment history" placeholder="Search item, seller or transaction ID"/>{query&&<button aria-label="Clear search" onClick={()=>setQuery("")}><X size={16}/></button>}</label><label className="history-select"><span>Status</span><select value={statusFilter} onChange={e=>setStatusFilter(e.target.value)}><option>All</option><option>Protected</option><option>Ready to release</option><option>Released</option><option>Refunded</option><option>On hold</option><option>Cancelled</option></select></label><label className="history-select"><span>Period</span><select value={period} onChange={e=>setPeriod(e.target.value)}><option>All time</option><option>Last 7 days</option><option>August 2026</option></select></label></div>
    <div className="history-results-heading"><div><b>{visible.length} payment{visible.length===1?"":"s"}</b><span>{statusFilter==="All"?"All transaction records":`${statusFilter} transaction records`}</span></div><span><LockKey size={16}/> Records cannot be changed after payment</span></div>
    <div className="table-card history-table"><div className="table-head"><span>Payment</span><span>Buyer and seller</span><span>Amount</span><span>Fee</span><span>Status</span><span>Date</span><span/></div>{visible.length?visible.map(item=><motion.button className="table-row" key={item.ref} onClick={()=>item.ref==="PP-260822-9X7L"?openModal("track"):onSelect(item)} whileHover={{x:2}}><span className="history-payment-cell"><span className={`history-product-mark history-product-mark--${item.status.toLowerCase().replaceAll(" ","-")}`}><Receipt size={20} weight="fill"/></span><span><b>{item.item}</b><small>{item.ref} · {item.channel}</small></span></span><span className="history-parties"><b>{item.seller}</b><small>Buyer: {item.buyer}</small></span><b>{money(item.amount)}</b><span>{money(item.fee)}</span><span><em className={`status-pill status-pill--${item.status.toLowerCase().replaceAll(" ","-")}`}>{item.status}</em></span><span>{item.date}</span><ArrowRight size={17}/></motion.button>):<div className="history-empty"><MagnifyingGlass size={34}/><b>No payments found</b><span>Try a different search term, status or date period.</span><button onClick={()=>{setQuery("");setStatusFilter("All");setPeriod("All time")}}>Clear all filters</button></div>}</div>
    <footer className="history-footer"><span><ShieldCheck size={18} weight="fill"/> ProofPay keeps a permanent record of every protected transaction.</span><span>Showing {visible.length} of {rows.length}</span></footer>
  </motion.section>
}

function DisputesView({stage,openModal}){return <motion.section className="content-page" initial={{opacity:0,y:10}} animate={{opacity:1,y:0}}><div className="page-title"><div><span className="eyebrow">RESOLUTION</span><h2>Disputes and support</h2><p>Open a case, add evidence and follow a fair resolution process.</p></div><AppButton icon={Flag} onClick={()=>openModal("dispute")}>Report a problem</AppButton></div><div className="empty-feature"><div className="empty-feature__icon"><Shield size={48}/></div><h3>{stage==="disputed"?"Your case is being reviewed":"No open disputes"}</h3><p>{stage==="disputed"?"Case DP-2208-04 is protecting GHS 300.00 while our team reviews the evidence.":"If a product or service does not match the agreement, report it before the inspection period ends."}</p><AppButton variant="secondary" icon={stage==="disputed"?ChatCircleText:Info} onClick={()=>openModal("help")}>{stage==="disputed"?"View case messages":"Learn how disputes work"}</AppButton></div><div className="resolution-steps">{[{icon:Flag,t:"Report the issue",p:"Choose the transaction and explain what happened."},{icon:UploadSimple,t:"Add evidence",p:"Attach delivery photos, messages or supporting files."},{icon:UsersThree,t:"Fair review",p:"Both parties can respond before a decision is made."}].map(({icon:Icon,t,p},i)=><div key={t}><span>{i+1}</span><Icon size={28}/><b>{t}</b><p>{p}</p></div>)}</div></motion.section>}

const customerConversations=[
  {id:"ama",name:"Ama Store",role:"Seller · PP-260822-9X7L",preview:"Your blender is ready for delivery.",time:"10:42 AM",unread:2,initials:"AS",tone:"green"},
  {id:"support",name:"ProofPay Support",role:"Case support",preview:"We received the evidence you sent.",time:"Yesterday",unread:0,initials:"PP",tone:"blue"},
  {id:"agent",name:"Adom Verified Agent",role:"Agent · Madina",preview:"I can help you with the USSD steps.",time:"21 Aug",unread:0,initials:"AV",tone:"navy"},
];
const agentLocations=[
  {name:"Adom MoMo Services",area:"Madina Market, Accra",hours:"Open · closes 7:00 PM",services:"Registration · payment · transaction help",distance:"0.8 km",initials:"AM"},
  {name:"Grace Bank & Mobile Money",area:"Legon Main Road, Accra",hours:"Open · closes 8:00 PM",services:"USSD support · verification · dispute help",distance:"1.6 km",initials:"GB"},
  {name:"Nii's Verified Pay Point",area:"Atomic Junction, Accra",hours:"Open · closes 6:30 PM",services:"Payment requests · status checks · language help",distance:"2.4 km",initials:"NP"},
  {name:"Rural Trust Agent",area:"Abokobi Township",hours:"Open · closes 6:00 PM",services:"Voice support · registration · seller onboarding",distance:"4.1 km",initials:"RT"},
];

function MessagesView({notify}){
  const [selected,setSelected]=useState(customerConversations[0]),[draft,setDraft]=useState(""),[messages,setMessages]=useState({ama:[{mine:false,text:"Hello Kojo. Your blender is ready for delivery this afternoon.",time:"10:30 AM"},{mine:true,text:"Thank you. Please use the delivery code in the agreement.",time:"10:34 AM"},{mine:false,text:"Yes, I will. The payment still shows as protected on my side.",time:"10:42 AM"}],support:[{mine:false,text:"Hello Kojo. ProofPay Support is here to help with your protected transaction.",time:"Yesterday"}],agent:[{mine:false,text:"I can guide you through *719# without touching your phone or asking for your PIN.",time:"21 Aug"}]});
  const send=()=>{if(!draft.trim())return;setMessages(current=>({...current,[selected.id]:[...(current[selected.id]||[]),{mine:true,text:draft.trim(),time:"Now"}]}));setDraft("");notify("Message sent securely.")};
  return <motion.section className="content-page customer-page messages-page" initial={{opacity:0,y:10}} animate={{opacity:1,y:0}}><div className="page-title"><div><span className="eyebrow">SECURE CONVERSATIONS</span><h2>Messages</h2><p>Talk to the other party, your assigned agent or ProofPay Support inside the transaction record.</p></div><AppButton variant="secondary" icon={Headset} onClick={()=>setSelected(customerConversations[1])}>Contact support</AppButton></div><div className="messages-layout"><aside className="conversation-list"><label><MagnifyingGlass size={18}/><input placeholder="Search conversations"/></label>{customerConversations.map(item=><button key={item.id} className={selected.id===item.id?"is-active":""} onClick={()=>setSelected(item)}><span className={`conversation-avatar conversation-avatar--${item.tone}`}>{item.initials}</span><span><b>{item.name}</b><small>{item.role}</small><em>{item.preview}</em></span><span><small>{item.time}</small>{item.unread>0&&<i>{item.unread}</i>}</span></button>)}</aside><section className="chat-panel"><header><span className={`conversation-avatar conversation-avatar--${selected.tone}`}>{selected.initials}</span><div><b>{selected.name}</b><small>{selected.role} · Verified participant</small></div><button onClick={()=>notify(`Call request prepared for ${selected.name}.`)}><Phone size={20}/></button><button onClick={()=>notify("Conversation safety details opened.")}><Info size={20}/></button></header><div className="chat-safety"><LockKey size={17}/><span>Messages are attached to the protected transaction. Never share your MoMo PIN or payment OTP.</span></div><div className="chat-thread">{(messages[selected.id]||[]).map((message,index)=><div className={message.mine?"is-mine":""} key={`${message.time}-${index}`}><span>{message.text}</span><small>{message.time}</small></div>)}</div><footer><button aria-label="Attach evidence" onClick={()=>notify("Evidence attachment picker opened.")}><UploadSimple size={21}/></button><label><input value={draft} onChange={e=>setDraft(e.target.value)} onKeyDown={e=>e.key==="Enter"&&send()} placeholder={`Message ${selected.name}`}/></label><AppButton icon={PaperPlaneTilt} onClick={send}>Send</AppButton></footer></section></div></motion.section>
}

function AgentsView({notify}){
  const [query,setQuery]=useState(""),[selected,setSelected]=useState(null);const visible=agentLocations.filter(a=>`${a.name} ${a.area} ${a.services}`.toLowerCase().includes(query.toLowerCase()));
  return <motion.section className="content-page customer-page agents-page" initial={{opacity:0,y:10}} animate={{opacity:1,y:0}}><div className="page-title"><div><span className="eyebrow">ASSISTED ACCESS</span><h2>Verified ProofPay agents</h2><p>Find trained support near you. An agent can guide you, but only you can confirm payment, release or refund.</p></div><AppButton icon={Phone} onClick={()=>notify("USSD access opened: dial *719# on your phone.")}>Use USSD instead</AppButton></div><div className="agent-safety"><ShieldCheck size={29} weight="fill"/><div><b>A ProofPay agent will never ask for your MoMo PIN.</b><span>Keep your phone in your hand and personally approve every wallet prompt.</span></div><button>Agent safety rules <ArrowRight size={15}/></button></div><div className="agent-toolbar"><label><MagnifyingGlass size={19}/><input value={query} onChange={e=>setQuery(e.target.value)} placeholder="Search by area, town or service"/></label><select><option>Within 5 km</option><option>Within 10 km</option><option>All locations</option></select><select><option>Open now</option><option>All hours</option></select></div><div className="agents-layout"><section className="agent-results"><header><b>{visible.length} verified agents near Accra</b><span>Location updates are simulated for this pitch prototype.</span></header>{visible.map(agent=><button key={agent.name} className={selected?.name===agent.name?"is-active":""} onClick={()=>setSelected(agent)}><span className="agent-logo">{agent.initials}</span><span><b>{agent.name}<SealCheck size={15} weight="fill"/></b><small>{agent.area}</small><em>{agent.services}</em></span><span><b>{agent.distance}</b><small className="green-text">{agent.hours}</small><ArrowRight size={16}/></span></button>)}</section><aside className="agent-detail">{selected?<><span className="agent-logo agent-logo--large">{selected.initials}</span><SealCheck size={23} weight="fill"/><h3>{selected.name}</h3><p>{selected.area}</p><dl><div><dt>Status</dt><dd className="green-text">{selected.hours}</dd></div><div><dt>Distance</dt><dd>{selected.distance}</dd></div><div><dt>Services</dt><dd>{selected.services}</dd></div><div><dt>Languages</dt><dd>English · Twi · Ga</dd></div></dl><AppButton icon={Phone} onClick={()=>notify(`Calling request prepared for ${selected.name}.`)}>Call agent</AppButton><AppButton variant="secondary" icon={ChatCircleText} onClick={()=>notify(`Secure message opened with ${selected.name}.`)}>Send message</AppButton></>:<><UsersThree size={43}/><h3>Select an agent</h3><p>Choose a verified location to view its services, opening hours and support options.</p></>}</aside></div></motion.section>
}

function SettingsView({notify}){
  const [tab,setTab]=useState("Profile"),[saved,setSaved]=useState(false);const tabs=["Profile","Security","Payment methods","Notifications","Accessibility"];
  const save=()=>{setSaved(true);notify("Settings saved successfully.");window.setTimeout(()=>setSaved(false),2200)};
  return <motion.section className="content-page customer-page settings-page" initial={{opacity:0,y:10}} animate={{opacity:1,y:0}}><div className="page-title"><div><span className="eyebrow">MY ACCOUNT</span><h2>Settings</h2><p>Manage your verified profile, security, payment methods and communication preferences.</p></div><StatusBadge saved={saved}/></div><div className="settings-layout"><nav>{tabs.map(item=><button key={item} className={tab===item?"is-active":""} onClick={()=>setTab(item)}>{item==="Profile"?<User size={20}/>:item==="Security"?<ShieldCheck size={20}/>:item==="Payment methods"?<Wallet size={20}/>:item==="Notifications"?<Bell size={20}/>:<Globe size={20}/>}<span>{item}</span><ArrowRight size={15}/></button>)}</nav><section className="settings-panel">{tab==="Profile"&&<><header><h3>Personal information</h3><p>This name must match your verified Ghana Card and wallet.</p></header><div className="profile-summary"><span className="avatar avatar--blue">KM</span><div><b>Kojo Mensah</b><small>Individual account · Fully verified</small></div><span><SealCheck size={17} weight="fill"/> Verified</span></div><div className="settings-form"><label>Full legal name<input defaultValue="Kojo Mensah"/></label><label>Preferred name<input defaultValue="Kojo"/></label><label>Mobile number<input defaultValue="055 123 4567" disabled/></label><label>Email address<input defaultValue="kojo.mensah@example.com"/></label><label>Country<select><option>Ghana</option></select></label><label>Preferred language<select><option>English</option><option>Twi</option><option>Ga</option><option>Ewe</option></select></label></div></>}{tab==="Security"&&<SettingsSecurity/>}{tab==="Payment methods"&&<PaymentMethods/>}{tab==="Notifications"&&<SettingsToggles title="Notification preferences" items={["Payment protected","Delivery and inspection reminders","Release or refund updates","Dispute messages","Security alerts","Product education"]}/>} {tab==="Accessibility"&&<SettingsToggles title="Accessibility and language" items={["Simple-language explanations","Read important terms aloud","High-contrast payment states","Large text mode","SMS copy of every critical update","Agent-assisted access"]}/>}<footer><AppButton variant="secondary">Cancel</AppButton><AppButton icon={saved?CheckCircle:SealCheck} onClick={save}>{saved?"Saved":"Save changes"}</AppButton></footer></section></div></motion.section>
}
function StatusBadge({saved}){return <span className={`settings-saved ${saved?"is-saved":""}`}>{saved?<CheckCircle size={17} weight="fill"/>:<LockKey size={17}/>} {saved?"Changes saved":"Account protected"}</span>}
function SettingsSecurity(){return <><header><h3>Security controls</h3><p>Protect your identity and release decisions. ProofPay never stores your wallet PIN.</p></header><div className="security-settings"><article><ShieldCheck size={25} weight="fill"/><div><b>Phone verification</b><span>055 *** 4567 · verified with OTP</span></div><em>Active</em></article><article><IdentificationCard size={25}/><div><b>Identity verification</b><span>Ghana Card and biometric match</span></div><em>Verified</em></article><article><LockKey size={25}/><div><b>ProofPay confirmation code</b><span>Used only for transaction-specific release actions</span></div><button>Change code</button></article><article><DeviceMobile size={25}/><div><b>Trusted devices</b><span>1 active device · last used today</span></div><button>Review</button></article></div><div className="settings-warning"><WarningCircle size={21}/><span><b>Your wallet PIN stays with your payment provider.</b><small>ProofPay staff and agents will never ask for it.</small></span></div></>}
function PaymentMethods(){return <><header><h3>Verified payment methods</h3><p>These existing wallets and accounts can fund or receive protected payments.</p></header><div className="payment-method-list"><article><span className="method-logo method-logo--momo">MoMo</span><div><b>MTN MoMo</b><span>055 *** 4567 · Kojo Mensah</span></div><em>Primary · Verified</em><button>Manage</button></article><article><span className="method-logo">BANK</span><div><b>Bank account</b><span>Not connected</span></div><em>Optional</em><button>Connect</button></article><article><span className="method-logo">VISA</span><div><b>Visa card</b><span>Not connected</span></div><em>Optional</em><button>Connect</button></article></div><div className="identity-note"><Wallet size={24}/><div><b>ProofPay is not another wallet</b><span>Your connected provider moves the money while ProofPay protects the transaction.</span></div></div></>}
function SettingsToggles({title,items}){return <><header><h3>{title}</h3><p>Choose how ProofPay should guide and update you.</p></header><div className="toggle-list">{items.map((item,index)=><label key={item}><span><b>{item}</b><small>{index<2?"Recommended for safe payments":"You can change this at any time"}</small></span><input type="checkbox" defaultChecked={index!==5}/><i/></label>)}</div></>}

function HelpSupportView({openModal,notify,onGoAgents}){
  const [openFaq,setOpenFaq]=useState(0),[message,setMessage]=useState("");const faqs=["How does ProofPay protect my money?","When will a seller receive the money?","What happens when I report a problem?","Can an agent approve a payment for me?","Does ProofPay need my MoMo PIN?"];
  return <motion.section className="content-page customer-page help-page" initial={{opacity:0,y:10}} animate={{opacity:1,y:0}}><div className="help-hero"><div><span className="eyebrow">HELP & SUPPORT</span><h2>How can we help you today?</h2><p>Find a simple answer, speak to support or get help through USSD and a verified agent.</p><label><MagnifyingGlass size={20}/><input placeholder="Search payments, disputes, agents or security"/></label></div><Headset size={72} weight="fill"/></div><div className="help-options"><button onClick={()=>notify("Live support chat opened.")}><ChatCircleText size={27}/><span><b>Chat with support</b><small>Average reply under 3 minutes</small></span><ArrowRight size={17}/></button><button onClick={()=>notify("Call request created for 0302 000 777.")}><Phone size={27}/><span><b>Call ProofPay</b><small>Available 24 hours every day</small></span><ArrowRight size={17}/></button><button onClick={()=>openModal("ussd")}><DeviceMobile size={27}/><span><b>Use USSD</b><small>Dial *719# without internet</small></span><ArrowRight size={17}/></button><button onClick={onGoAgents}><UsersThree size={27}/><span><b>Visit an agent</b><small>Get guided help near you</small></span><ArrowRight size={17}/></button></div><div className="help-grid"><section className="faq-panel"><span className="eyebrow">COMMON QUESTIONS</span><h3>Quick answers</h3>{faqs.map((faq,index)=><article key={faq}><button onClick={()=>setOpenFaq(openFaq===index?-1:index)}><b>{faq}</b><Plus size={18}/></button>{openFaq===index&&<p>{index===0?"A licensed payment partner safeguards the money. ProofPay records the agreement and sends a release or refund instruction only when the agreed conditions are satisfied.":index===1?"A fully green transaction is released automatically. ProofPay targets a decision in under five seconds and wallet credit normally within one minute.":index===2?"The payment is frozen, both parties can submit evidence and a trained reviewer records a fair release, refund or split decision.":index===3?"No. An agent can explain the steps, but the customer must personally confirm payment, release and refund actions.":"No. Enter your PIN only inside the official prompt from MTN MoMo, Telecel Cash, AT Money or your bank."}</p>}</article>)}</section><section className="support-form"><span className="eyebrow">SEND A SUPPORT REQUEST</span><h3>Tell us what you need</h3><label>Topic<select><option>Payment or release</option><option>Dispute</option><option>Account verification</option><option>Agent concern</option><option>Security or fraud</option></select></label><label>Transaction ID, if available<input placeholder="Example: PP-260822-9X7L"/></label><label>Your message<textarea value={message} onChange={e=>setMessage(e.target.value)} rows="5" placeholder="Explain what happened in your own words."/></label><AppButton icon={PaperPlaneTilt} disabled={!message.trim()} onClick={()=>{notify("Support request submitted. Reference SUP-260824-18.");setMessage("")}}>Send to support</AppButton><small><LockKey size={14}/> Do not include your MoMo PIN, bank password or payment OTP.</small></section></div></motion.section>
}

function ModalShell({title,subtitle,onClose,children,wide=false,className="",embedded=false}){
  const content=<motion.section className={`${embedded?"embedded-flow":"modal"} ${wide&&!embedded?"modal--wide":""} ${className}`} initial={{opacity:0,y:embedded?10:26,scale:embedded?1:.975}} animate={{opacity:1,y:0,scale:1}} exit={{opacity:0,y:embedded?-8:18,scale:embedded?1:.98}} transition={spring} onMouseDown={e=>e.stopPropagation()}><header className={embedded?"embedded-flow__header":"modal-header"}><div><h2>{title}</h2>{subtitle&&<p>{subtitle}</p>}</div><motion.button whileTap={{scale:.9}} onClick={onClose} aria-label={embedded?"Return to dashboard":"Close modal"}>{embedded?<ArrowLeft size={22}/>:<X size={23}/>}</motion.button></header>{children}</motion.section>;
  return embedded?content:<motion.div className="modal-backdrop" initial={{opacity:0}} animate={{opacity:1}} exit={{opacity:0}} onMouseDown={onClose}>{content}</motion.div>;
}

const wizardSteps=["Parties","Agreement","Release rule","Review"];
function CreatePaymentModal({onClose,onCreated,onTrack,embedded=false}){
  const [step,setStep]=useState(0),[processing,setProcessing]=useState(false),[complete,setComplete]=useState(false);
  const [verifying,setVerifying]=useState(false),[partyVerified,setPartyVerified]=useState(false),[partiesConfirmed,setPartiesConfirmed]=useState(false);
  const [releaseConfirmed,setReleaseConfirmed]=useState(false);
  const [reviewConfirmed,setReviewConfirmed]=useState(false);
  const [walletPrompt,setWalletPrompt]=useState(false),[receiptCopied,setReceiptCopied]=useState(false);
  const [persistenceNote,setPersistenceNote]=useState("");
  const [form,setForm]=useState({creatorRole:"buyer",seller:"024 987 6543",sellerName:"Ama Store",country:"Ghana (+233)",provider:"MTN MoMo",accountType:"Business",language:"English",channel:"SMS",item:"Blender",amount:"300.00",date:"22 August 2026",evidence:"Delivery photo and buyer confirmation",inspection:"24 hours",rule:"Buyer confirms delivery"});
  const update=(k,v)=>setForm(x=>({...x,[k]:v}));
  const openWalletPrompt=()=>setWalletPrompt(true);
  const approveWallet=async()=>{
    setProcessing(true);
    try{
      const result=await createProtectedTransaction({
        counterpartyPhone:form.seller,
        counterpartyName:form.sellerName,
        counterpartyProvider:form.provider,
        item:form.item,
        amount:Number(form.amount),
        currency:"GHS",
        deliveryDate:form.date,
        evidenceRequired:form.evidence,
        inspectionPeriod:form.inspection,
        releaseRule:form.rule,
      });
      setPersistenceNote(result?.mode==="browser-demo"?"Saved securely in this browser for the offline pitch demo.":"Saved to the ProofPay database with an auditable transaction record.");
    }catch(error){
      setPersistenceNote(error.message||"The demo completed, but its server record could not be saved.");
    }finally{
      window.setTimeout(()=>{setProcessing(false);setWalletPrompt(false);setComplete(true);onCreated()},650);
    }
  };
  const copyReference=async()=>{try{await navigator.clipboard.writeText("PP-260822-9X7L");setReceiptCopied(true);window.setTimeout(()=>setReceiptCopied(false),1800)}catch{setReceiptCopied(true)}};
  const downloadReceipt=()=>{const receipt=`PROOFPAY PROTECTED PAYMENT RECEIPT\n\nTransaction: PP-260822-9X7L\nStatus: PROTECTED\nBuyer: Kojo Mensah\nSeller: ${form.sellerName}\nItem: ${form.item}\nProtected amount: GHS ${form.amount}\nProtection fee: GHS 4.50\nTotal authorised: GHS 304.50\nRelease rule: ${form.rule}\nInspection period: ${form.inspection}\n\nThe protected amount is held by a licensed payment partner in a safeguarded account.`;const blob=new Blob([receipt],{type:"text/plain"});const url=URL.createObjectURL(blob);const anchor=document.createElement("a");anchor.href=url;anchor.download="ProofPay-PP-260822-9X7L-receipt.txt";anchor.click();URL.revokeObjectURL(url)};
  const updateParty=(k,v)=>{update(k,v);setPartyVerified(false);setPartiesConfirmed(false)};
  const verifyParty=()=>{setVerifying(true);window.setTimeout(()=>{setVerifying(false);setPartyVerified(true)},1200)};
  const otherRole=form.creatorRole==="buyer"?"Seller / receiver":"Buyer / sender";
  return <ModalShell title={complete?"Payment protected":"Create protected payment"} subtitle={complete?"Your agreement is active and the seller can now deliver.":"Set clear terms before money moves."} onClose={onClose} wide className={embedded?"embedded-flow--wizard":"modal--wizard"} embedded={embedded}>
    {!complete&&<div className="wizard-steps">{wizardSteps.map((label,index)=><div className={index===step?"is-active":index<step?"is-complete":""} key={label}><span>{index<step?<Check size={15} weight="bold"/>:index+1}</span><b>{label}</b></div>)}</div>}
    <AnimatePresence mode="wait">{complete?<motion.div className="payment-success-page" key="success" initial={{opacity:0,y:12}} animate={{opacity:1,y:0}}>
      <section className="payment-success-hero">
        <motion.div className="success-shield" initial={{scale:0,rotate:-18}} animate={{scale:1,rotate:0}} transition={{...spring,delay:.08}}><ShieldCheck size={64} weight="fill"/></motion.div>
        <div><span className="success-kicker">PAYMENT SUCCESSFUL · TRANSACTION PROTECTED</span><h3>GHS {form.amount} is now safeguarded</h3><p>Your payment was approved through MTN MoMo. The protected amount is held by a licensed payment partner and will be released only under the agreed rule.</p></div>
        <span className="success-status-pill"><CheckCircle size={18} weight="fill"/> PROTECTED</span>
      </section>
      <div className="success-confirmations"><span><CheckCircle size={18} weight="fill"/><b>Wallet payment confirmed</b><small>GHS 304.50 authorised</small></span><span><Bank size={18} weight="fill"/><b>Funds safeguarded</b><small>GHS {form.amount} protected</small></span><span><Bell size={18} weight="fill"/><b>Seller notified</b><small>{form.sellerName} can now deliver</small></span></div>
      <div className="success-content-grid">
        <section className="success-receipt-card">
          <div className="success-card-heading"><div><Receipt size={22} weight="fill"/><span><small>PROOFPAY RECEIPT</small><h4>PP-260822-9X7L</h4></span></div><button type="button" onClick={copyReference}><Copy size={15}/>{receiptCopied?"Copied":"Copy ID"}</button></div>
          <div className="success-receipt-grid">
            <div><small>BUYER / SENDER</small><b>Kojo Mensah</b><span>MTN MoMo · 055 *** 4567</span></div>
            <div><small>SELLER / RECEIVER</small><b>{form.sellerName}</b><span>{form.provider} · 024 *** 6543</span></div>
            <div><small>ITEM OR SERVICE</small><b>{form.item}</b></div>
            <div><small>DELIVERY DATE</small><b>{form.date}</b></div>
            <div><small>PROTECTED AMOUNT</small><b>GHS {form.amount}</b></div>
            <div><small>PROTECTION FEE</small><b>GHS 4.50</b></div>
            <div className="success-receipt-wide"><small>ACTIVE RELEASE RULE</small><b><ListChecks size={16} weight="fill"/> {form.rule}</b><span>{form.inspection} inspection period · disputes freeze release</span></div>
          </div>
        </section>
        <aside className="success-next-card">
          <span className="eyebrow">WHAT HAPPENS NEXT?</span><h4>The seller can now fulfil the agreement</h4>
          <div className="success-next-list"><div className="is-active"><span>1</span><p><b>Payment protected</b><small>Completed now</small></p><CheckCircle size={17} weight="fill"/></div><div><span>2</span><p><b>{form.sellerName} delivers</b><small>Evidence will be submitted</small></p><Clock size={17}/></div><div><span>3</span><p><b>You inspect the item</b><small>{form.inspection} to respond</small></p><Clock size={17}/></div><div><span>4</span><p><b>Release or report a problem</b><small>You remain in control</small></p><ShieldCheck size={17}/></div></div>
          <div className="success-safeguard"><Bank size={22} weight="fill"/><span><b>Money is not in ProofPay’s business account</b><small>It remains with the licensed payment partner until release or refund.</small></span></div>
        </aside>
      </div>
      {persistenceNote&&<div className="success-persistence-note"><CheckCircle size={18} weight="fill"/><span>{persistenceNote}</span></div>}
      <div className="success-actions"><AppButton variant="secondary" icon={DownloadSimple} onClick={downloadReceipt}>Download receipt</AppButton><AppButton icon={ArrowRight} onClick={onTrack||onClose}>Track protected payment</AppButton></div>
    </motion.div>:<motion.div key={step} className="wizard-body" initial={{opacity:0,x:24}} animate={{opacity:1,x:0}} exit={{opacity:0,x:-20}}>
      {step===0&&<div className="parties-layout">
        <div className="parties-main">
          <section className="party-section">
            <div className="section-heading"><div><span>YOUR ROLE</span><h3>What are you doing?</h3></div><small>This determines who pays and who receives.</small></div>
            <div className="role-selector">
              <button className={form.creatorRole==="buyer"?"is-selected":""} onClick={()=>update("creatorRole","buyer")}><User size={25}/><span><b>I am buying or paying</b><small>Buyer / sender</small></span><CheckCircle size={21} weight="fill"/></button>
              <button className={form.creatorRole==="seller"?"is-selected":""} onClick={()=>update("creatorRole","seller")}><Storefront size={25}/><span><b>I am selling or receiving</b><small>Seller / receiver</small></span><CheckCircle size={21} weight="fill"/></button>
            </div>
          </section>

          <section className="party-section">
            <div className="section-heading"><div><span>YOUR VERIFIED DETAILS</span><h3>Kojo Mensah</h3></div><span className="verified-label"><SealCheck size={17} weight="fill"/> Verified</span></div>
            <div className="current-user-card"><div className="avatar avatar--blue">KM</div><div><b>{form.creatorRole==="buyer"?"Buyer / sender":"Seller / receiver"}</b><span>055 *** 4567 · MTN MoMo</span></div><div className="check-stack"><span><CheckCircle size={16} weight="fill"/> Phone</span><span><CheckCircle size={16} weight="fill"/> Wallet</span><span><CheckCircle size={16} weight="fill"/> Identity</span></div></div>
          </section>

          <section className="party-section">
            <div className="section-heading"><div><span>OTHER PARTY</span><h3>Add the {otherRole.toLowerCase()}</h3></div><small>We verify the number before money moves.</small></div>
            <div className="party-form">
              <label>Country<select value={form.country} onChange={e=>updateParty("country",e.target.value)}><option>Ghana (+233)</option><option>Nigeria (+234)</option><option>Kenya (+254)</option></select></label>
              <label>Mobile-money provider<select value={form.provider} onChange={e=>updateParty("provider",e.target.value)}><option>MTN MoMo</option><option>Telecel Cash</option><option>AT Money</option><option>Bank account</option></select></label>
              <label>Mobile number<input value={form.seller} onChange={e=>updateParty("seller",e.target.value)}/><small>We send an OTP or invitation to this number.</small></label>
              <label>Person or business name<input value={form.sellerName} onChange={e=>updateParty("sellerName",e.target.value)}/><small>Enter the name you know them by.</small></label>
              <label>Account type<select value={form.accountType} onChange={e=>update("accountType",e.target.value)}><option>Business</option><option>Individual</option></select></label>
              <label>Preferred language<select value={form.language} onChange={e=>update("language",e.target.value)}><option>English</option><option>Twi</option><option>Ga</option><option>Ewe</option><option>Hausa</option></select></label>
              <label className="form-span">Send invitation through<div className="channel-selector">{["SMS","WhatsApp","Voice call"].map(channel=><button type="button" className={form.channel===channel?"is-selected":""} onClick={()=>update("channel",channel)} key={channel}>{channel}</button>)}</div></label>
            </div>
            {!partyVerified?<AppButton className="verify-party-button" icon={verifying?SpinnerGap:PaperPlaneTilt} disabled={verifying||!form.seller||!form.sellerName} onClick={verifyParty}>{verifying?"Checking wallet and sending invite…":"Verify and invite"}</AppButton>:<motion.div className="verified-party-card" initial={{opacity:0,y:8}} animate={{opacity:1,y:0}}><div className="verified-party-icon"><Storefront size={25} weight="fill"/></div><div><span>VERIFICATION RESULT</span><b>{form.sellerName} verified</b><small>{form.provider} · 024 *** 6543 · Wallet name: AMA SERWAA MENSAH</small><em><PaperPlaneTilt size={14}/> Invitation sent by {form.channel}</em></div><SealCheck size={28} weight="fill"/></motion.div>}
          </section>
        </div>

        <aside className="party-readiness">
          <div className="readiness-shield"><ShieldCheck size={32} weight="fill"/></div><span className="eyebrow">PARTY READINESS</span><h3>{partyVerified?"Both parties identified":"Verification needed"}</h3><p>{partyVerified?"The other party has a verified wallet and can review the agreement.":"Verify the other party before creating the agreement."}</p>
          <div className="readiness-list"><span className="is-ready"><CheckCircle size={18} weight="fill"/> Your phone is verified</span><span className="is-ready"><CheckCircle size={18} weight="fill"/> Your wallet is verified</span><span className={partyVerified?"is-ready":""}>{partyVerified?<CheckCircle size={18} weight="fill"/>:<Clock size={18}/>} Other party verified</span><span className={partyVerified?"is-ready":""}>{partyVerified?<CheckCircle size={18} weight="fill"/>:<Clock size={18}/>} Invitation sent</span></div>
          <div className="security-note"><LockKey size={22}/><div><b>Your PIN stays private</b><span>ProofPay never asks for a MoMo PIN, bank password or payment OTP.</span></div></div>
          <label className={`party-confirmation ${partyVerified?"":"is-disabled"}`}><input type="checkbox" disabled={!partyVerified} checked={partiesConfirmed} onChange={e=>setPartiesConfirmed(e.target.checked)}/><span>I confirm that these are the correct people for this transaction.</span></label>
        </aside>
      </div>}
      {step===1&&<div className="form-grid"><label>Item or service<input value={form.item} onChange={e=>update("item",e.target.value)}/></label><label>Amount (GHS)<input value={form.amount} onChange={e=>update("amount",e.target.value)}/></label><label>Delivery date<input value={form.date} onChange={e=>update("date",e.target.value)}/></label><label>Inspection period<select value={form.inspection} onChange={e=>update("inspection",e.target.value)}><option>24 hours</option><option>48 hours</option><option>3 days</option></select></label><label className="form-span">Required evidence<select value={form.evidence} onChange={e=>update("evidence",e.target.value)}><option>Delivery photo and buyer confirmation</option><option>Buyer confirmation only</option><option>Signed delivery note</option></select></label></div>}
      {step===2&&<div className="release-rule-layout">
        <div className="release-rule-main">
          <section className="release-section">
            <div className="section-heading"><div><span>PRIMARY RELEASE CONDITION</span><h3>When should the payment be released?</h3></div><small>Choose the condition that both parties will accept.</small></div>
            <div className="release-options">{[
              {rule:"Buyer confirms delivery",icon:ShieldCheck,title:"Buyer confirms delivery",text:"Release only after Kojo checks the item and actively approves it.",tag:"MOST PROTECTIVE"},
              {rule:"Inspection period expires",icon:Clock,title:"Release after inspection period",text:`Release automatically ${form.inspection} after delivery evidence if no dispute is raised.`,tag:"AUTOMATIC"},
              {rule:"Buyer or expiry",icon:ListChecks,title:"Buyer confirms or time expires",text:`Release when Kojo approves, or after ${form.inspection} if no problem is reported.`,tag:"RECOMMENDED"},
            ].map(({rule,icon:Icon,title,text,tag})=><button key={rule} type="button" className={form.rule===rule?"is-selected":""} onClick={()=>{update("rule",rule);setReleaseConfirmed(false)}}><span className="release-option-icon"><Icon size={26} weight="fill"/></span><span className="release-option-copy"><em>{tag}</em><b>{title}</b><small>{text}</small></span><CheckCircle className="release-option-check" size={23} weight="fill"/></button>)}</div>
          </section>

          <section className="release-section">
            <div className="section-heading"><div><span>SAFETY CONDITIONS</span><h3>What happens before and after release?</h3></div><small>These protections apply automatically.</small></div>
            <div className="release-safety-grid">
              <div><span className="release-safety-icon release-safety-icon--blue"><ImageSquare size={22} weight="fill"/></span><span><b>Delivery evidence starts the clock</b><small>A delivery photo and buyer confirmation must be submitted first.</small></span></div>
              <div><span className="release-safety-icon release-safety-icon--green"><Clock size={22} weight="fill"/></span><span><b>{form.inspection} inspection period</b><small>Kojo can inspect the item before payment leaves protection.</small></span></div>
              <div><span className="release-safety-icon release-safety-icon--amber"><Flag size={22} weight="fill"/></span><span><b>A reported problem freezes release</b><small>The money remains protected while ProofPay reviews the case.</small></span></div>
              <div><span className="release-safety-icon release-safety-icon--blue"><DeviceMobile size={22} weight="fill"/></span><span><b>Approval works on any phone</b><small>Kojo can approve through web, USSD, SMS, voice or an assisted agent.</small></span></div>
            </div>
          </section>

          <section className="release-timeline" aria-label="Release process">
            <div><span><Package size={20} weight="fill"/></span><b>Seller delivers</b><small>Evidence submitted</small></div><ArrowRight size={18}/>
            <div><span><Clock size={20} weight="fill"/></span><b>Buyer inspects</b><small>{form.inspection} to respond</small></div><ArrowRight size={18}/>
            <div><span><ShieldCheck size={20} weight="fill"/></span><b>ProofPay decides</b><small>Under 5 seconds</small></div><ArrowRight size={18}/>
            <div><span><Bank size={20} weight="fill"/></span><b>Partner pays</b><small>Normally within 1 minute</small></div>
          </section>
        </div>

        <aside className="release-summary-card">
          <div className="readiness-shield"><ShieldCheck size={32} weight="fill"/></div><span className="eyebrow">RELEASE SUMMARY</span><h3>{form.rule}</h3><p>The payment will stay protected until this condition is satisfied.</p>
          <div className="release-summary-list">
            <div><span>Protected amount</span><b>GHS {form.amount}</b></div>
            <div><span>Receiver</span><b>{form.sellerName}</b></div>
            <div><span>Inspection period</span><b>{form.inspection}</b></div>
            <div><span>Problem reported</span><b className="hold-text">Release freezes</b></div>
          </div>
          <div className="verified-payout"><Storefront size={24} weight="fill"/><span><small>VERIFIED PAYOUT DESTINATION</small><b>{form.provider} · 024 *** 6543</b><em><SealCheck size={14} weight="fill"/> Wallet name matched</em></span></div>
          <div className="security-note"><LockKey size={22}/><div><b>Your MoMo PIN is never used here</b><span>The buyer confirms this ProofPay rule with a transaction code, not a wallet PIN.</span></div></div>
          <label className="release-confirmation"><input type="checkbox" checked={releaseConfirmed} onChange={e=>setReleaseConfirmed(e.target.checked)}/><span>I understand and accept this release rule for both parties.</span></label>
        </aside>
      </div>}
      {step===3&&<div className="final-review-layout">
        <div className="final-review-main">
          <section className="review-ready-banner"><span><ShieldCheck size={27} weight="fill"/></span><div><small>FINAL CHECK</small><h3>Everything is ready for your approval</h3><p>Confirm the people, agreement and release rule before the payment request is sent to your wallet.</p></div></section>

          <section className="review-detail-section">
            <div className="review-section-heading"><div><span>1</span><div><small>PARTIES</small><h3>Who is paying and receiving?</h3></div></div><button type="button" onClick={()=>setStep(0)}><PencilSimple size={15}/> Edit</button></div>
            <div className="review-party-grid">
              <div><span className="avatar avatar--blue">KM</span><div><small>BUYER / SENDER</small><b>Kojo Mensah</b><em><SealCheck size={14} weight="fill"/> Identity and wallet verified</em><p>MTN MoMo · 055 *** 4567</p></div></div>
              <div><span className="review-store-icon"><Storefront size={21} weight="fill"/></span><div><small>SELLER / RECEIVER</small><b>{form.sellerName}</b><em><SealCheck size={14} weight="fill"/> Business and wallet verified</em><p>{form.provider} · 024 *** 6543</p></div></div>
            </div>
          </section>

          <section className="review-detail-section">
            <div className="review-section-heading"><div><span>2</span><div><small>AGREEMENT</small><h3>What is being protected?</h3></div></div><button type="button" onClick={()=>setStep(1)}><PencilSimple size={15}/> Edit</button></div>
            <div className="agreement-review-grid">
              <div><small>ITEM OR SERVICE</small><b>{form.item}</b></div>
              <div><small>PROTECTED AMOUNT</small><b>GHS {form.amount}</b></div>
              <div><small>DELIVERY DATE</small><b>{form.date}</b></div>
              <div><small>INSPECTION PERIOD</small><b>{form.inspection}</b></div>
              <div className="review-wide"><small>REQUIRED EVIDENCE</small><b><ImageSquare size={16} weight="fill"/> {form.evidence}</b></div>
            </div>
          </section>

          <section className="review-detail-section">
            <div className="review-section-heading"><div><span>3</span><div><small>RELEASE RULE</small><h3>When can the seller receive the money?</h3></div></div><button type="button" onClick={()=>setStep(2)}><PencilSimple size={15}/> Edit</button></div>
            <div className="review-release-rule"><span><ListChecks size={24} weight="fill"/></span><div><b>{form.rule}</b><p>{form.rule==="Buyer or expiry"||form.rule==="Buyer confirms or time expires"?`Release when Kojo approves, or after ${form.inspection} if no problem is reported.`:form.rule==="Inspection period expires"?`Release automatically ${form.inspection} after delivery evidence if no dispute is raised.`:"Release only after Kojo checks the item and actively approves it."}</p><div><em><Flag size={14} weight="fill"/> A reported problem freezes release</em><em><DeviceMobile size={14} weight="fill"/> Web, USSD, SMS or voice approval</em></div></div></div>
          </section>
        </div>

        <aside className="payment-review-card">
          <div className="payment-review-icon"><Wallet size={29} weight="fill"/></div><span className="eyebrow">PAYMENT SUMMARY</span><h3>Authorise from your MTN MoMo wallet</h3><p>ProofPay will send the secure payment prompt to 055 *** 4567.</p>
          <div className="payment-breakdown">
            <div><span>Protected amount</span><b>GHS {form.amount}</b></div>
            <div><span>ProofPay protection fee</span><b>GHS 4.50</b></div>
            <div><span>Payment processing</span><b>Included</b></div>
            <div className="payment-total"><span>Total to authorise</span><b>GHS 304.50</b></div>
          </div>
          <div className="safeguard-explainer"><Bank size={23} weight="fill"/><div><b>Where the money stays</b><span>A licensed payment partner holds the protected amount in a safeguarded account. It never enters ProofPay’s normal business account.</span></div></div>
          <div className="payout-review"><Storefront size={20} weight="fill"/><div><small>FINAL PAYOUT</small><b>{form.sellerName}</b><span>{form.provider} · 024 *** 6543</span></div><SealCheck size={20} weight="fill"/></div>
          <div className="wallet-security"><LockKey size={20}/><span><b>Your PIN stays in your wallet</b><small>Enter your MoMo PIN only inside the official MTN prompt. ProofPay will never ask for it.</small></span></div>
          <label className="review-consent"><input type="checkbox" checked={reviewConfirmed} onChange={e=>setReviewConfirmed(e.target.checked)}/><span>I have checked the parties, terms, fees and release rule. I authorise ProofPay to create this protected payment.</span></label>
        </aside>
      </div>}
    </motion.div>}</AnimatePresence>
    {!complete&&<footer className="wizard-footer"><AppButton variant="ghost" icon={step?ArrowLeft:X} onClick={()=>step?setStep(step-1):onClose()}>{step?"Back":"Cancel"}</AppButton>{step<3?<AppButton icon={ArrowRight} disabled={(step===0&&(!partyVerified||!partiesConfirmed))||(step===2&&!releaseConfirmed)} onClick={()=>setStep(step+1)}>{step===0?"Continue to agreement":step===1?"Continue to release rule":"Continue to review"}</AppButton>:<AppButton icon={LockKey} disabled={!reviewConfirmed} onClick={openWalletPrompt}>Authorise GHS 304.50 in wallet</AppButton>}</footer>}
    <AnimatePresence>{walletPrompt&&<motion.div className="wallet-authorisation-overlay" initial={{opacity:0}} animate={{opacity:1}} exit={{opacity:0}}>
      <motion.section className="wallet-authorisation-dialog" initial={{opacity:0,y:18,scale:.97}} animate={{opacity:1,y:0,scale:1}} exit={{opacity:0,y:12,scale:.98}} transition={spring} role="dialog" aria-modal="true" aria-labelledby="wallet-authorisation-title">
        <header><div><span className="wallet-provider-mark"><Wallet size={24} weight="fill"/></span><span><small>PAYMENT PROVIDER</small><b>MTN MoMo secure authorisation</b></span></div><button type="button" aria-label="Close wallet authorisation" onClick={()=>!processing&&setWalletPrompt(false)}><X size={20}/></button></header>
        <div className="wallet-dialog-body">
          <div className="wallet-phone-badge"><DeviceMobile size={28} weight="fill"/></div><span className="wallet-dialog-kicker">AUTHORISATION REQUEST SENT</span><h3 id="wallet-authorisation-title">Approve GHS 304.50 in your official MTN MoMo prompt</h3><p>A secure wallet request has been sent to <b>055 *** 4567</b>. Confirm it on your phone to create the protected payment.</p>
          <div className="wallet-amount-card"><span><small>PROOFPAY PROTECTED PAYMENT</small><b>{form.item} from {form.sellerName}</b><em>PP-260822-9X7L</em></span><strong>GHS 304.50</strong></div>
          <div className="wallet-breakdown"><div><span>Protected amount</span><b>GHS {form.amount}</b></div><div><span>ProofPay protection fee</span><b>GHS 4.50</b></div></div>
          <div className="wallet-pin-rule"><LockKey size={23}/><span><b>ProofPay cannot see or collect your MoMo PIN</b><small>Enter your PIN only inside the official MTN MoMo prompt on your phone. Never share it with an agent.</small></span></div>
          <div className="wallet-waiting-state"><motion.span animate={processing?{rotate:360}:{scale:[1,1.06,1]}} transition={processing?{repeat:Infinity,duration:1,ease:"linear"}:{repeat:Infinity,duration:1.8}}>{processing?<SpinnerGap size={23}/>:<DeviceMobile size={23} weight="fill"/>}</motion.span><div><b>{processing?"Waiting for wallet confirmation…":"Check your phone now"}</b><small>{processing?"ProofPay is securely verifying the provider response.":"The wallet request will expire in 2 minutes."}</small></div></div>
        </div>
        <footer><AppButton variant="ghost" disabled={processing} onClick={()=>setWalletPrompt(false)}>Cancel</AppButton><AppButton icon={processing?SpinnerGap:CheckCircle} className={processing?"is-loading":""} disabled={processing} onClick={approveWallet}>{processing?"Confirming with MTN MoMo…":"Pitch demo: approve in wallet"}</AppButton></footer>
        <div className="wallet-simulation-note"><Info size={15}/><span>Pitch simulation only. Production approval happens in the customer’s official wallet channel.</span></div>
      </motion.section>
    </motion.div>}</AnimatePresence>
  </ModalShell>;
}

function TrackModal({stage,setStage,onClose,notify}){const [busy,setBusy]=useState(false);const advance=()=>{setBusy(true);window.setTimeout(()=>{const next=stage==="protected"?"delivered":"released";setStage(next);setBusy(false);notify(next==="delivered"?"Seller delivery recorded. The buyer can inspect the item.":"GHS 300.00 released safely to Ama Store.")},1200)};return <ModalShell title="Track transaction" subtitle="PP-260822-9X7L · Blender from Ama Store" onClose={onClose} wide><div className="track-layout"><div className="track-main"><div className={`track-hero track-hero--${stage}`}><motion.span animate={busy?{rotate:360}:{rotate:0}} transition={busy?{repeat:Infinity,duration:1,ease:"linear"}:{}}>{busy?<CircleNotch size={40}/>:stage==="released"?<CheckCircle size={40} weight="fill"/>:stage==="delivered"?<Package size={40} weight="fill"/>:<ShieldCheck size={40} weight="fill"/>}</motion.span><div><small>CURRENT STATUS</small><h3>{busy?"Updating transaction…":stage==="released"?"Payment released":stage==="delivered"?"Delivered — awaiting buyer":"Payment protected"}</h3><p>{stage==="released"?"Ama Store has received the approved payment.":stage==="delivered"?"Inspect the blender before approving release.":"The seller can deliver. Funds remain protected."}</p></div></div><ProgressTracker stage={stage}/><div className="evidence-strip"><div><ImageSquare size={26}/><span><b>Delivery evidence</b><small>{stage==="protected"?"Waiting for seller":"1 photo · submitted 1:05 PM"}</small></span></div><span className={stage==="protected"?"muted-pill":"status-pill status-pill--completed"}>{stage==="protected"?"Not submitted":"Received"}</span></div></div><aside className="track-side"><img src="/assets/blender.png" alt="Blender"/><h3>Blender</h3><p>Ama Store · GHS 300.00</p><div><span>Inspection period</span><b>24 hours</b></div><div><span>Release condition</span><b>Buyer confirms</b></div></aside></div><footer className="wizard-footer"><AppButton variant="ghost" onClick={onClose}>Close</AppButton>{stage==="protected"&&<AppButton icon={Truck} disabled={busy} onClick={advance}>{busy?"Recording delivery…":"Pitch demo: record delivery"}</AppButton>}{stage==="delivered"&&<AppButton icon={ShieldCheck} disabled={busy} onClick={advance}>{busy?"Releasing safely…":"Confirm delivery and release"}</AppButton>}{stage==="released"&&<AppButton icon={CheckCircle} onClick={onClose}>Done</AppButton>}</footer></ModalShell>}

function PaymentDetailModal({payment,onClose}){
  if(!payment)return null;
  const tone=payment.status.toLowerCase().replaceAll(" ","-");
  const returned=payment.status==="Refunded"||payment.status==="Cancelled";
  const downloadReceipt=()=>{const text=`ProofPay transaction record\n${payment.ref}\n${payment.item}\nSeller: ${payment.seller}\nBuyer: ${payment.buyer}\nAmount: GHS ${payment.amount.toFixed(2)}\nFee: GHS ${payment.fee.toFixed(2)}\nStatus: ${payment.status}\nDate: ${payment.date}`;const url=URL.createObjectURL(new Blob([text],{type:"text/plain"}));const link=document.createElement("a");link.href=url;link.download=`ProofPay-${payment.ref}.txt`;link.click();URL.revokeObjectURL(url)};
  return <ModalShell title="Payment record" subtitle={`${payment.ref} · ${payment.item}`} onClose={onClose} wide>
    <div className="payment-detail-body">
      <section className={`payment-detail-hero payment-detail-hero--${tone}`}><span>{returned?<ArrowCounterClockwise size={34} weight="fill"/>:<CheckCircle size={34} weight="fill"/>}</span><div><small>FINAL STATUS</small><h3>{payment.status}</h3><p>{payment.status==="Released"?`GHS ${payment.amount.toFixed(2)} was released to ${payment.seller} after the agreement conditions were completed.`:payment.status==="Refunded"?`GHS ${payment.amount.toFixed(2)} was returned to ${payment.buyer}.`:`This payment request was cancelled before funds were protected.`}</p></div><em className={`status-pill status-pill--${tone}`}>{payment.status}</em></section>
      <div className="payment-detail-grid">
        <section className="payment-detail-card"><span className="eyebrow">TRANSACTION DETAILS</span><div><span>Item or service</span><b>{payment.item}</b></div><div><span>Protected amount</span><b>GHS {payment.amount.toFixed(2)}</b></div><div><span>Protection fee</span><b>GHS {payment.fee.toFixed(2)}</b></div><div><span>Payment channel</span><b>{payment.channel}</b></div><div><span>Transaction date</span><b>{payment.date}</b></div></section>
        <section className="payment-detail-card"><span className="eyebrow">PARTIES</span><div><span>Buyer / sender</span><b>{payment.buyer}</b></div><div><span>Seller / receiver</span><b>{payment.seller}</b></div><div><span>Identity checks</span><b className="detail-verified"><SealCheck size={16} weight="fill"/> Both verified</b></div><div><span>Transaction reference</span><b>{payment.ref}</b></div><div><span>Record security</span><b>Permanent and auditable</b></div></section>
        <aside className="payment-detail-note"><Bank size={27} weight="fill"/><span><b>{payment.status==="Released"?"Safeguarded funds were released correctly":payment.status==="Refunded"?"Safeguarded funds were returned correctly":"No protected funds were collected"}</b><small>ProofPay keeps the agreement, payment instructions and provider confirmations together in one record.</small></span></aside>
      </div>
    </div><footer className="wizard-footer"><AppButton variant="ghost" onClick={onClose}>Close</AppButton><AppButton variant="secondary" icon={DownloadSimple} onClick={downloadReceipt}>Download receipt</AppButton></footer>
  </ModalShell>
}

function DisputeModal({onClose,onSubmit}){const [submitted,setSubmitted]=useState(false),[busy,setBusy]=useState(false);const submit=()=>{setBusy(true);window.setTimeout(()=>{setBusy(false);setSubmitted(true);onSubmit()},1100)};return <ModalShell title={submitted?"Payment placed on hold":"Report a problem"} subtitle={submitted?"Case DP-2208-04 has been opened.":"Transaction PP-260822-9X7L"} onClose={onClose}>{submitted?<div className="success-state success-state--compact"><div className="warning-orb"><Flag size={44} weight="fill"/></div><h3>Your GHS 300.00 remains protected</h3><p>ProofPay has stopped automatic release while the case is reviewed. Both parties will receive updates.</p><AppButton icon={ChatCircleText} onClick={onClose}>View case timeline</AppButton></div>:<div className="dispute-form"><label>What went wrong?<select><option>Item has not arrived</option><option>Wrong item delivered</option><option>Item is damaged</option></select></label><label>Tell us what happened<textarea rows="4" defaultValue="The seller marked the blender as delivered, but I have not received it."/></label><button className="upload-box"><UploadSimple size={27}/><span><b>Add photos or documents</b><small>PNG, JPG or PDF · up to 10 MB</small></span></button><div className="identity-note"><Shield size={25}/><div><b>We protect both parties</b><span>The payment remains on hold while the evidence is reviewed.</span></div></div></div>}{!submitted&&<footer className="wizard-footer"><AppButton variant="ghost" onClick={onClose}>Cancel</AppButton><AppButton icon={busy?SpinnerGap:Flag} className={busy?"is-loading":""} disabled={busy} onClick={submit}>{busy?"Protecting payment…":"Submit problem"}</AppButton></footer>}</ModalShell>}

function UssdModal({onClose,setStage,notify}){
  const [screen,setScreen]=useState("language"),[,setEntry]=useState(""),[hint,setHint]=useState(""),[codeBuffer,setCodeBuffer]=useState(""),[reason,setReason]=useState("Item not received");
  const [phoneMode,setPhoneMode]=useState("standby"),[dialBuffer,setDialBuffer]=useState(""),[sessionSeconds,setSessionSeconds]=useState(58);
  const screens={
    language:{step:1,title:"Welcome to ProofPay",lines:["Use ProofPay without internet.","Choose your language."],options:[["1","English"],["2","Twi"],["3","Ga"],["4","Ewe"]]},
    consent:{step:1,title:"Confirm this phone",lines:["Network number: 055 *** 4567","We will verify your phone and wallet.","ProofPay never asks for your wallet PIN."],options:[["1","Agree and continue"],["2","Hear verification details"],["0","Speak to support"]]},
    consentDetails:{step:1,title:"How verification works",lines:["Your network confirms this phone.","A licensed partner checks wallet status.","Your identity name must match."],options:[["1","Continue"],["0","Back"]]},
    verified:{step:1,title:"Account verified",lines:["Kojo Mensah","MTN MoMo: 055 *** 4567","Phone, wallet and identity matched."],options:[["1","Open ProofPay menu"],["0","Speak to support"]]},
    home:{step:2,title:"ProofPay main menu",lines:["Pay safe. Pay smart."],options:[["1","Create protected payment"],["2","Accept payment invitation"],["3","Check a transaction"],["4","Release or report a problem"],["5","My verified profile"],["0","Help and agent support"]]},
    createRole:{step:2,title:"Create protected payment",lines:["What are you doing?"],options:[["1","I am buying or paying"],["2","I am selling or receiving"],["0","Back"]]},
    receiver:{step:3,title:"Choose the receiver",lines:["Saved verified receiver:"],options:[["1","Ama Store · 024 *** 6543"],["2","Invite another receiver"],["0","Back"]]},
    terms:{step:3,title:"Review agreement",lines:["Item: 50kg bags of rice","Amount: GHS 300.00","Delivery: 22 August 2026","Inspection: 24 hours","Evidence: Photo + buyer confirmation"],options:[["1","Accept these terms"],["2","Hear full terms"],["0","Cancel"]]},
    termsAudio:{step:3,title:"Agreement read aloud",lines:["Ama Store will deliver 50kg bags of rice.","GHS 300 stays protected.","You have 24 hours to inspect.","A problem freezes release."],options:[["1","Accept these terms"],["0","Back"]]},
    payMethod:{step:4,title:"Choose payment method",lines:["Protected amount: GHS 300.00","Protection fee: GHS 4.50"],options:[["1","MTN MoMo · 055 *** 4567"],["2","Connected bank account"],["0","Cancel"]]},
    walletPrompt:{step:4,title:"Authorise with your provider",lines:["An official MTN MoMo prompt was sent.","Enter your PIN only in the MTN prompt.","ProofPay cannot see or store your PIN."],options:[["1","Demo: payment authorised"],["2","Resend wallet prompt"],["0","Cancel payment"]]},
    protectedSuccess:{step:5,title:"Payment protected",lines:["Reference: PP-260824-US71","GHS 300.00 is safeguarded.","Ama Store has been notified.","You will receive an SMS receipt."],options:[["1","Check this transaction"],["2","View receipt"],["0","Main menu"]]},
    invitation:{step:3,title:"Payment invitation",lines:["Ama Store sent a protected request.","Item: 50kg bags of rice","Amount: GHS 300.00"],options:[["1","Review and accept"],["2","Reject request"],["0","Main menu"]]},
    sellerMenu:{step:2,title:"Seller tools",lines:["Receive money safely."],options:[["1","Create payment request"],["2","Check protected payment"],["0","Main menu"]]},
    sellerRequest:{step:3,title:"Review payment request",lines:["Buyer: Kojo Mensah","Item: 50kg bags of rice","Amount: GHS 300.00","Release: Buyer confirms or 24h expires"],options:[["1","Send protected request"],["2","Hear details"],["0","Back"]]},
    sellerSent:{step:4,title:"Request sent",lines:["Kojo Mensah received the request.","Money will be safeguarded after payment.","Reference: PP-260824-US71"],options:[["1","Check payment status"],["0","Main menu"]]},
    transaction:{step:5,title:"Transaction PP-260824-US71",lines:["Status: Delivered · payment protected","Amount: GHS 300.00","Seller: Ama Store","Evidence: Delivery photo received","Inspection time left: 22 hours"],options:[["1","Accept delivery and release"],["2","Report a problem"],["3","Hear agreement details"],["4","Speak to support"],["0","Main menu"]]},
    details:{step:5,title:"Protected transaction details",lines:["50kg bags of rice","Delivery photo received at 1:05 PM","Release only after your approval or inspection expiry.","A reported problem freezes release."],options:[["1","Release payment"],["2","Report a problem"],["0","Back"]]},
    releaseConfirm:{step:6,title:"Confirm final release",lines:["Release GHS 300.00 to Ama Store?","This action cannot be reversed.","Use your ProofPay transaction code.","Do not enter your MoMo PIN."],options:[["1","Enter confirmation code"],["2","Not now"],["0","Back"]]},
    code:{step:6,title:"Enter ProofPay code",lines:["Enter your 4-digit transaction code.","Press * to delete.","Press # to confirm.","This is not your wallet PIN."],options:[]},
    releaseSuccess:{step:6,title:"Payment released safely",lines:["GHS 300.00 sent to Ama Store.","Partner confirmation received.","Release time: 42 seconds","SMS receipt is on the way."],options:[["1","View receipt"],["0","Main menu"]]},
    disputeReason:{step:6,title:"Report a problem",lines:["Choose what happened."],options:[["1","Item not received"],["2","Wrong item delivered"],["3","Item damaged"],["4","Service not completed"],["0","Back"]]},
    disputeConfirm:{step:6,title:"Confirm the problem",lines:["Reason: "+reason,"GHS 300.00 will remain protected.","Both parties can submit evidence."],options:[["1","Submit and freeze release"],["2","Change reason"],["0","Cancel"]]},
    disputeSuccess:{step:6,title:"Payment placed on hold",lines:["Case: DSP-260824-US7","GHS 300.00 remains protected.","ProofPay Support will contact both parties."],options:[["1","Speak to support"],["2","View transaction receipt"],["0","Main menu"]]},
    support:{step:2,title:"Help and agent support",lines:["Choose the help you need."],options:[["1","Request a support call"],["2","Find a verified agent"],["3","Change language"],["0","Main menu"]]},
    supportSent:{step:2,title:"Support request received",lines:["Reference: SUP-260824-71","A trained agent will call you shortly.","Never share your wallet PIN."],options:[["0","Main menu"]]},
    agent:{step:2,title:"Nearest verified agent",lines:["Adom MoMo Services","Madina Market · 0.8 km","Open until 7:00 PM","Agent can guide you but cannot approve for you."],options:[["1","Request agent call"],["0","Back"]]},
    profile:{step:2,title:"My verified profile",lines:["Kojo Mensah","Phone: 055 *** 4567 · verified","MTN MoMo wallet · active","Identity match · verified"],options:[["1","Check transaction"],["2","Get support"],["0","Main menu"]]},
    receipt:{step:6,title:"ProofPay receipt",lines:["Reference: PP-260824-US71","Item: 50kg bags of rice","Amount: GHS 300.00","Seller: Ama Store","Record sent by SMS."],options:[["1","Check transaction"],["0","Main menu"]]}
  };
  const routes={
    language:{"1":"consent","2":"consent","3":"consent","4":"consent"},consent:{"1":"verified","2":"consentDetails","0":"support"},consentDetails:{"1":"verified","0":"consent"},verified:{"1":"home","0":"support"},
    home:{"1":"createRole","2":"invitation","3":"transaction","4":"transaction","5":"profile","0":"support"},createRole:{"1":"receiver","2":"sellerMenu","0":"home"},receiver:{"1":"terms","2":"terms","0":"createRole"},
    terms:{"1":"payMethod","2":"termsAudio","0":"home"},termsAudio:{"1":"payMethod","0":"terms"},payMethod:{"1":"walletPrompt","2":"walletPrompt","0":"home"},walletPrompt:{"1":"protectedSuccess","2":"walletPrompt","0":"home"},
    protectedSuccess:{"1":"transaction","2":"receipt","0":"home"},invitation:{"1":"terms","2":"home","0":"home"},sellerMenu:{"1":"sellerRequest","2":"transaction","0":"home"},sellerRequest:{"1":"sellerSent","2":"termsAudio","0":"sellerMenu"},sellerSent:{"1":"transaction","0":"home"},
    transaction:{"1":"releaseConfirm","2":"disputeReason","3":"details","4":"support","0":"home"},details:{"1":"releaseConfirm","2":"disputeReason","0":"transaction"},releaseConfirm:{"1":"code","2":"transaction","0":"transaction"},
    releaseSuccess:{"1":"receipt","0":"home"},disputeReason:{"1":"disputeConfirm","2":"disputeConfirm","3":"disputeConfirm","4":"disputeConfirm","0":"transaction"},disputeConfirm:{"1":"disputeSuccess","2":"disputeReason","0":"transaction"},disputeSuccess:{"1":"support","2":"receipt","0":"home"},
    support:{"1":"supportSent","2":"agent","3":"language","0":"home"},supportSent:{"0":"home"},agent:{"1":"supportSent","0":"support"},profile:{"1":"transaction","2":"support","0":"home"},receipt:{"1":"transaction","0":"home"}
  };
  const current=screens[screen]||screens.home;
  const go=next=>{setScreen(next);setEntry("");setHint("");setCodeBuffer("")};
  useEffect(()=>{
    if(phoneMode!=="session")return undefined;
    const timer=window.setInterval(()=>setSessionSeconds(previous=>{
      if(previous<=1){window.clearInterval(timer);setPhoneMode("expired");setHint("Session expired. Dial *719# again.");return 0}
      return previous-1
    }),1000);
    return()=>window.clearInterval(timer)
  },[phoneMode,screen]);
  const press=value=>{
    setSessionSeconds(58);
    setEntry(value);setHint("");
    if(screen==="code"){
      if(/^\d$/.test(value)){setCodeBuffer(previous=>previous.length<4?previous+value:previous);return}
      if(value==="*"){setCodeBuffer(previous=>previous.slice(0,-1));return}
      if(value==="#"){
        if(codeBuffer.length!==4){setHint("Enter all 4 digits before pressing #.");return}
        setStage("released");go("releaseSuccess");notify("USSD release confirmed. GHS 300.00 released safely in 42 seconds.");return
      }
      return
    }
    if(value==="*"){go("home");return}
    if(screen==="disputeReason"&&["1","2","3","4"].includes(value)){setReason({"1":"Item not received","2":"Wrong item delivered","3":"Item damaged","4":"Service not completed"}[value])}
    const next=routes[screen]?.[value];
    if(!next){setHint("Choose one of the menu numbers shown.");window.setTimeout(()=>setEntry(""),500);return}
    window.setTimeout(()=>{
      if(next==="protectedSuccess"){setStage("protected");notify("USSD payment authorised. GHS 300.00 is now protected.")}
      if(next==="sellerSent")notify("Protected payment request sent through USSD.")
      if(next==="disputeSuccess"){setStage("disputed");notify("USSD dispute submitted. GHS 300.00 remains protected.")}
      go(next)
    },220)
  };
  const startSession=()=>{
    if(dialBuffer!=="*719#"){setHint("That code is not recognised. Dial *719#.");return}
    setPhoneMode("connecting");setHint("");
    window.setTimeout(()=>{setPhoneMode("session");setSessionSeconds(58);go("language")},650)
  };
  const endSession=()=>{setPhoneMode("ended");setDialBuffer("");setEntry("");setHint("USSD session ended.")};
  const phoneKey=value=>{
    if(phoneMode==="session"){press(value);return}
    if(phoneMode==="connecting")return;
    setHint("");setPhoneMode("dialing");
    setDialBuffer(previous=>previous.length<12?previous+value:previous)
  };
  const clearDial=()=>{setDialBuffer(previous=>previous.slice(0,-1));setHint("")};
  const restart=target=>{setPhoneMode("session");setSessionSeconds(58);setScreen(target);setEntry("");setHint("");setCodeBuffer("")};
  const journeyLabels=["Access","Menu","Agreement","Payment","Protected","Outcome"];
  return <ModalShell title="ProofPay basic-phone showcase" subtitle="Dial *719# · Full protected-payment journey without internet." onClose={onClose} wide className="ussd-modal">
    <div className="ussd-experience">
      <section className="ussd-showcase">
        <div className="ussd-journey-progress">{journeyLabels.map((label,index)=><span className={index+1<current.step?"is-done":index+1===current.step?"is-current":""} key={label}><i>{index+1<current.step?<Check size={12} weight="bold"/>:index+1}</i><b>{label}</b></span>)}</div>
        <div className="feature-phone-stage">
          <div className="feature-phone-device" aria-label="Interactive feature phone">
            <img src="/assets/proofpay-feature-phone.png" alt="Front-facing feature phone for the ProofPay USSD demonstration"/>
            <div className="feature-phone-screen">
              <div className="feature-phone-status"><span>MTN GH</span><span>{phoneMode==="session"?`00:${String(sessionSeconds).padStart(2,"0")}`:"14:28"}</span><span>4G</span></div>
              <AnimatePresence mode="wait">
                <motion.div key={`${phoneMode}-${screen}`} initial={{opacity:0,x:8}} animate={{opacity:1,x:0}} exit={{opacity:0,x:-8}} className="feature-phone-content">
                  {phoneMode==="standby"&&<><span className="phone-logo">ProofPay</span><strong>Safe payment on any phone</strong><p>Dial <b>*719#</b> to begin.</p><small>No internet or app needed.</small></>}
                  {phoneMode==="dialing"&&<><small>USSD code</small><strong className="dialled-code">{dialBuffer||"_"}</strong><p>Press the green call key.</p>{hint&&<em>{hint}</em>}</>}
                  {phoneMode==="connecting"&&<div className="phone-connecting"><CircleNotch size={22}/><strong>Connecting…</strong><small>Starting secure USSD session</small></div>}
                  {(phoneMode==="ended"||phoneMode==="expired")&&<><strong>{phoneMode==="expired"?"Session timed out":"Session ended"}</strong><p>No money was moved.</p><small>Dial *719# to start again.</small></>}
                  {phoneMode==="session"&&<div className="ussd-script">
                    <small>PROOFPAY · {sessionSeconds}s</small><h3>{current.title}</h3>
                    {current.lines.map((line,index)=><p key={line+index}>{line}</p>)}
                    {screen==="code"&&<div className="ussd-code-entry">{codeBuffer.padEnd(4,"•").split("").map((digit,index)=><span key={index}>{digit==="•"?"•":"●"}</span>)}</div>}
                    <div className="ussd-options">{current.options.map(([number,label])=><p key={number+label}><b>{number}.</b> {label}</p>)}</div>
                    {hint&&<em className="ussd-hint">{hint}</em>}
                  </div>}
                </motion.div>
              </AnimatePresence>
              <div className="feature-phone-softkeys"><span onClick={clearDial}>{phoneMode==="session"?"Back":"Clear"}</span><span>{phoneMode==="session"?"Reply":"Call"}</span></div>
            </div>
            <button className="phone-hotspot phone-hotspot--call" aria-label="Call *719#" onClick={startSession}/>
            <button className="phone-hotspot phone-hotspot--end" aria-label="End USSD session" onClick={endSession}/>
            <div className="phone-hotspot-grid">{[1,2,3,4,5,6,7,8,9,"*",0,"#"].map(number=><motion.button whileTap={{scale:.84}} aria-label={`Press ${number}`} key={number} onClick={()=>phoneKey(String(number))}/>)}</div>
          </div>
          <div className={`phone-live-state phone-live-state--${phoneMode}`}>{phoneMode==="session"?<><span className="live-dot"/>Live session · {sessionSeconds}s remaining</>:phoneMode==="connecting"?<><CircleNotch size={15} className="is-spinning"/>Connecting to *719#</>:<><Phone size={15}/>Dial *719# and press the green key</>}</div>
        </div>
      </section>
      <aside className="ussd-guide">
        <span className="eyebrow">LIVE FEATURE-PHONE DEMO</span><h3>Use it exactly like a real phone</h3><p>Press <b>* 7 1 9 #</b> on the handset, then press the green call key. During the session, answer with the physical number keys.</p>
        <div className="ussd-demo-steps"><span><b>1</b>Dial *719#</span><span><b>2</b>Press green call</span><span><b>3</b>Reply with menu numbers</span><span><b>4</b>Press red to end</span></div>
        <div className="ussd-shortcuts"><button onClick={()=>restart("language")}><IdentificationCard size={20}/><span><b>Start with onboarding</b><small>Language, phone and wallet verification</small></span><ArrowRight size={15}/></button><button onClick={()=>restart("createRole")}><ShieldCheck size={20}/><span><b>Create a protected payment</b><small>Agreement, authorisation and protection</small></span><ArrowRight size={15}/></button><button onClick={()=>restart("transaction")}><CheckCircle size={20}/><span><b>Check and release</b><small>Delivery evidence and confirmation code</small></span><ArrowRight size={15}/></button><button onClick={()=>restart("disputeReason")}><Flag size={20}/><span><b>Report a problem</b><small>Freeze release and open a case</small></span><ArrowRight size={15}/></button><button onClick={()=>restart("support")}><Headset size={20}/><span><b>Agent and support</b><small>Guided help without giving away control</small></span><ArrowRight size={15}/></button></div>
        <div className="ussd-security-card"><LockKey size={24}/><span><b>The customer stays in control</b><small>ProofPay never asks for the mobile-money PIN. Agents can explain the menus but cannot approve payment, release or refund.</small></span></div>
        <div className="ussd-system-flow"><span><b>1</b>Telco session</span><ArrowRight size={13}/><span><b>2</b>ProofPay API</span><ArrowRight size={13}/><span><b>3</b>Licensed partner</span></div>
      </aside>
    </div>
  </ModalShell>
}

function SimpleInfoModal({type,onClose}){const language=type==="language";return <ModalShell title={language?"Choose your language":"Help and support"} subtitle={language?"Simple language across web, SMS, voice and USSD.":"Choose the fastest way to get help."} onClose={onClose}>{language?<div className="language-grid">{["English","Twi","Ga","Ewe","Hausa","French"].map((l,i)=><button className={i===0?"is-selected":""} key={l}><Globe size={21}/><span><b>{l}</b><small>{i===0?"Current language":"Demo translation"}</small></span>{i===0&&<CheckCircle size={20}/>}</button>)}</div>:<div className="support-list">{[{i:ChatCircleText,t:"Live chat",s:"Average response under 3 minutes"},{i:Phone,t:"Call ProofPay",s:"Speak to a trained support agent"},{i:FileText,t:"How protected payments work",s:"Simple guides with voice playback"},{i:Storefront,t:"Find an approved agent",s:"Get assisted service near you"}].map(({i:Icon,t,s})=><button key={t}><Icon size={28}/><span><b>{t}</b><small>{s}</small></span><ArrowRight size={18}/></button>)}</div>}</ModalShell>}
function Toast({message}){return <motion.div className="toast" initial={{opacity:0,y:25,scale:.96}} animate={{opacity:1,y:0,scale:1}} exit={{opacity:0,y:20,scale:.96}} transition={spring}><CheckCircle size={22} weight="fill"/><span>{message}</span></motion.div>}

function LandingAuthModal({mode,onClose,onEnter}){
  const signup=mode==="signup";
  const [provider,setProvider]=useState("MTN MoMo"),[phone,setPhone]=useState("055 123 4567"),[fullName,setFullName]=useState("Kojo Mensah"),[password,setPassword]=useState("ProofPay!2026"),[accepted,setAccepted]=useState(false),[busy,setBusy]=useState(false),[error,setError]=useState("");
  const continueToDemo=async()=>{
    setBusy(true);setError("");
    try{
      const result=signup?await registerAccount({fullName,phone,provider,password,acceptedTerms:accepted}):await loginAccount({phone,password});
      onEnter(result.user);
    }catch(requestError){setError(requestError.message||"ProofPay could not complete this request.");}
    finally{setBusy(false);}
  };
  return <motion.div className="public-auth-backdrop" initial={{opacity:0}} animate={{opacity:1}} exit={{opacity:0}} onMouseDown={onClose}>
    <motion.section className="public-auth-modal" initial={{opacity:0,y:24,scale:.98}} animate={{opacity:1,y:0,scale:1}} exit={{opacity:0,y:16,scale:.98}} onMouseDown={event=>event.stopPropagation()}>
      <header><img src="/assets/proofpay-horizontal.png" alt="ProofPay"/><button onClick={onClose} aria-label="Close"><X size={22}/></button></header>
      <div className="public-auth-body"><span className="eyebrow">{signup?"CREATE YOUR PROOFPAY ACCESS":"WELCOME BACK"}</span><h2>{signup?"Start paying safely":"Log in to ProofPay"}</h2><p>{signup?"Use the phone number already connected to your mobile-money wallet. You do not need a new wallet.":"Enter the verified mobile number linked to your ProofPay account."}</p>
        {signup&&<label>Full name<input value={fullName} onChange={event=>setFullName(event.target.value)} autoComplete="name"/></label>}
        <label>Mobile-money provider<select value={provider} onChange={event=>setProvider(event.target.value)}><option>MTN MoMo</option><option>Telecel Cash</option><option>AT Money</option><option>Bank account</option></select></label>
        <label>Registered mobile number<input value={phone} onChange={event=>setPhone(event.target.value)} inputMode="tel" autoComplete="tel"/></label>
        <label>ProofPay password<input type="password" value={password} onChange={event=>setPassword(event.target.value)} autoComplete={signup?"new-password":"current-password"}/><small>Use at least 12 characters with uppercase, lowercase, a number and a symbol.</small></label>
        <div className="public-auth-note"><LockKey size={21}/><span><b>Your wallet PIN stays private</b><small>ProofPay will send an OTP to confirm this number. We never ask for your MoMo PIN.</small></span></div>
        {signup&&<label className="public-auth-check"><input type="checkbox" checked={accepted} onChange={event=>setAccepted(event.target.checked)}/><span>I agree to ProofPay's protected-payment terms and privacy notice.</span></label>}
        {error&&<div className="public-auth-error" role="alert"><WarningCircle size={18}/><span>{error}</span></div>}
        <AppButton icon={busy?SpinnerGap:ArrowRight} className={busy?"is-loading":""} disabled={busy||!phone||!password||(signup&&(!accepted||!fullName))} onClick={continueToDemo}>{busy?"Opening secure access…":signup?"Create secure demo account":"Log in securely"}</AppButton>
        <small className="public-auth-demo">With a Neon connection, the account is stored in PostgreSQL. Before keys are configured, ProofPay automatically uses an isolated browser demo account so the pitch remains fully usable.</small>
      </div>
    </motion.section>
  </motion.div>
}

function LandingPage({onEnter,onAdmin}){
  const [authMode,setAuthMode]=useState(null);
  const openAuth=mode=>setAuthMode(mode);
  const scrollTo=id=>document.getElementById(id)?.scrollIntoView({behavior:"smooth"});
  const steps=[
    {icon:UsersThree,title:"Agree on the transaction",text:"The buyer and seller confirm the item, price, delivery date and evidence."},
    {icon:Wallet,title:"Pay with your existing wallet",text:"Use MTN MoMo, Telecel Cash, AT Money or a connected bank account."},
    {icon:ShieldCheck,title:"Money stays protected",text:"A licensed payment partner safeguards the funds while the seller delivers."},
    {icon:CheckCircle,title:"Release or refund fairly",text:"Money moves only when the agreed release or refund condition is satisfied."},
  ];
  const audiences=[
    {icon:DeviceMobile,title:"Social-media buyers",text:"Pay sellers on WhatsApp, Instagram and Facebook without relying on screenshots."},
    {icon:Storefront,title:"Sellers and small businesses",text:"Give customers confidence while protecting honest sellers from false claims."},
    {icon:Bank,title:"Marketplaces and enterprises",text:"Add protected payments to an existing platform through ProofPay APIs."},
    {icon:Phone,title:"Basic-phone users",text:"Create, check, approve or report a problem through USSD, SMS, voice or an approved agent."},
  ];
  const paymentGroups=[
    {country:"Ghana",channels:[
      {name:"MTN MoMo",logo:"/assets/payment-networks/momo-psb-nigeria.webp",className:"wallet-logo-card--momo"},
      {name:"Telecel Cash",logo:"/assets/payment-networks/telecel-ghana.png",className:"wallet-logo-card--telecel"},
      {name:"AT Money",logo:"/assets/payment-networks/at-money-ghana.jpg",className:"wallet-logo-card--square"},
    ]},
    {country:"Togo",channels:[
      {name:"Mixx by Yas",logo:"/assets/payment-networks/mixx-by-yas-togo.svg"},
      {name:"Moov Flooz",logo:"/assets/payment-networks/moov-africa-togo.jpg"},
    ]},
    {country:"Nigeria",channels:[
      {name:"MoMo PSB",logo:"/assets/payment-networks/momo-psb-nigeria.webp"},
      {name:"Smartcash PSB",logo:"/assets/payment-networks/smartcash-psb-nigeria.png"},
    ]},
    {country:"More ways to pay",channels:[
      {name:"Bank account",icon:Bank},
      {name:"Visa card",logo:"/assets/payment-networks/visa-card.png",className:"wallet-logo-card--visa"},
    ]},
  ];
  return <div className="public-site">
    <div className="public-trust-strip"><ShieldCheck size={17} weight="fill"/><span>ProofPay works with your existing wallet. It never asks for your mobile-money PIN.</span><button onClick={()=>scrollTo("security")}>See how we protect you <ArrowRight size={14}/></button></div>
    <header className="public-nav"><a href="#top" className="public-brand" aria-label="ProofPay home"><img src="/assets/proofpay-horizontal.png" alt="ProofPay - Pay Safe. Pay Smart."/></a><nav aria-label="Public navigation"><button onClick={()=>scrollTo("how-it-works")}>How it works</button><button onClick={()=>scrollTo("who-uses-it")}>Who it helps</button><button onClick={()=>scrollTo("basic-phone")}>Basic phone</button><button onClick={()=>scrollTo("security")}>Security</button><button onClick={()=>scrollTo("business")}>For business</button></nav><div className="public-nav-actions"><button className="public-ops-login" onClick={onAdmin}><ShieldCheck size={17}/> Staff operations</button><button className="public-login" onClick={()=>openAuth("login")}>Log in</button><AppButton icon={ArrowRight} onClick={()=>openAuth("signup")}>Create free account</AppButton></div></header>

    <main id="top">
      <section className="public-hero">
        <div className="public-hero-copy"><span className="public-kicker"><SealCheck size={18} weight="fill"/> Protected payments for everyday trade</span><h1>Pay safely.<br/><em>Trade confidently.</em></h1><p>ProofPay protects your payment until the product or service you agreed on is delivered. Keep using the mobile-money wallet or bank account you already trust.</p><div className="public-hero-actions"><AppButton icon={ShieldCheck} onClick={()=>openAuth("signup")}>Start a protected payment</AppButton><AppButton variant="secondary" icon={ListChecks} onClick={()=>scrollTo("how-it-works")}>See how it works</AppButton></div><div className="public-hero-proof"><span><CheckCircle size={18} weight="fill"/> No new wallet</span><span><CheckCircle size={18} weight="fill"/> No MoMo PIN collected</span><span><CheckCircle size={18} weight="fill"/> Works on basic phones</span></div></div>
        <div className="public-hero-visual"><div className="public-product-frame"><header><ShieldCheck size={18} weight="fill"/><b>ProofPay protected-payment experience</b><em>LIVE DEMO</em></header><img src="/assets/proofpay-protected-payment-dashboard.jpg" alt="ProofPay protected payment success dashboard"/></div><div className="public-floating-card public-floating-card--safe"><ShieldCheck size={24} weight="fill"/><span><small>PAYMENT STATUS</small><b>GHS 300 safeguarded</b></span></div><div className="public-floating-card public-floating-card--wallet"><Wallet size={24} weight="fill"/><span><small>PAY WITH</small><b>Your existing wallet</b></span></div></div>
      </section>

      <section className="wallet-band" aria-label="Planned payment network coverage">
        <div className="wallet-band__inner">
          <div className="wallet-band__intro"><span>WORKS WITH THE PAYMENT METHODS PEOPLE ALREADY USE</span><b>One protection layer across everyday payment channels.</b></div>
          <div className="wallet-band__groups">
            {paymentGroups.map(group=><div className="wallet-country-group" key={group.country}><span>{group.country}</span><div className="wallet-logo-row">{group.channels.map(channel=>{const Icon=channel.icon;return <motion.div className={`wallet-logo-card ${Icon?"wallet-logo-card--icon":""} ${channel.className||""}`} key={channel.name} whileHover={{y:-3}} transition={spring}>{Icon?<Icon size={26} weight="duotone"/>:<img src={channel.logo} alt={`${channel.name} logo`}/>}<b>{channel.name}</b></motion.div>})}</div></div>)}
          </div>
        </div>
        <small>Planned coverage for the product vision. Availability depends on licensed partners and commercial agreements.</small>
      </section>

      <section className="public-section how-section" id="how-it-works"><div className="public-section-heading"><span className="eyebrow">HOW PROOFPAY WORKS</span><h2>Clear protection from agreement to release</h2><p>Mobile money moves the money. ProofPay protects the transaction.</p></div><div className="how-grid">{steps.map(({icon:Icon,title,text},index)=><article key={title}><span className="how-number">0{index+1}</span><span className="how-icon"><Icon size={28} weight="fill"/></span><h3>{title}</h3><p>{text}</p>{index<steps.length-1&&<ArrowRight className="how-arrow" size={21}/>}</article>)}</div><div className="how-assurance"><Bank size={30} weight="fill"/><span><b>Protected money does not enter ProofPay's business account.</b><small>A licensed payment partner keeps the money safeguarded until ProofPay sends an approved release or refund instruction.</small></span><button onClick={()=>scrollTo("security")}>Understand safeguarding <ArrowRight size={16}/></button></div></section>

      <section className="public-section story-section" id="use-cases"><div className="public-section-heading public-section-heading--left"><span className="eyebrow">PROOFPAY IN REAL LIFE</span><h2>Designed around how people already trade</h2><p>ProofPay fits between an agreement and the final release of money, whether the transaction begins on social media, in a physical market or inside another company's platform.</p></div><div className="story-grid">
        <article><div className="story-image"><img src="/assets/proofpay-usecase-social-commerce.jpg" alt="Ghanaian buyer inspecting a blender while a seller confirms payment on a phone"/><span><Storefront size={18} weight="fill"/> SOCIAL COMMERCE</span></div><div className="story-copy"><small>WHATSAPP PURCHASE · ACCRA</small><h3>Kojo can inspect the blender before Ama receives the payment</h3><p>The product, amount, delivery date and inspection period are agreed before payment. Ama receives proof that the money is protected, while Kojo keeps the right to report a problem before release.</p><ul><li><CheckCircle size={15} weight="fill"/> Seller knows the funds are available</li><li><CheckCircle size={15} weight="fill"/> Buyer does not depend on a screenshot</li></ul></div></article>
        <article><div className="story-image"><img src="/assets/proofpay-usecase-basic-phone-agent.jpg" alt="Ghanaian market trader using a feature phone with trained agent guidance"/><span><Phone size={18} weight="fill"/> INCLUSIVE ACCESS</span></div><div className="story-copy"><small>FEATURE PHONE · LOCAL MARKET</small><h3>Adwoa can use ProofPay without downloading an application</h3><p>An approved agent explains the terms, but Adwoa keeps her phone and personally confirms every important action through USSD, SMS or voice.</p><ul><li><CheckCircle size={15} weight="fill"/> Preferred-language support</li><li><CheckCircle size={15} weight="fill"/> The agent never handles her PIN</li></ul></div></article>
        <article><div className="story-image"><img src="/assets/proofpay-usecase-enterprise-api.jpg" alt="African business team reviewing protected-payment and delivery records"/><span><Bank size={18} weight="fill"/> BUSINESS API</span></div><div className="story-copy"><small>MARKETPLACE · ENTERPRISE</small><h3>A platform can add ProofPay without replacing its checkout</h3><p>The enterprise creates protected transactions through an API and receives verified payment, delivery, dispute and payout events through secure webhooks.</p><ul><li><CheckCircle size={15} weight="fill"/> One protection workflow across channels</li><li><CheckCircle size={15} weight="fill"/> Auditable settlement and reconciliation</li></ul></div></article>
      </div></section>

      <section className="public-section audience-section" id="who-uses-it"><div className="public-section-heading public-section-heading--left"><span className="eyebrow">BUILT FOR REAL-WORLD TRADE</span><h2>One protection layer for many kinds of payments</h2><p>ProofPay is not another marketplace or wallet. It protects transactions wherever the buyer and seller meet.</p></div><div className="audience-grid">{audiences.map(({icon:Icon,title,text})=><article key={title}><span><Icon size={27} weight="fill"/></span><h3>{title}</h3><p>{text}</p><button onClick={()=>openAuth("signup")}>Use ProofPay <ArrowRight size={15}/></button></article>)}</div></section>

      <section className="public-section access-section" id="basic-phone"><div className="access-copy"><span className="eyebrow">INCLUSIVE BY DESIGN</span><h2>Safe payments should not require an expensive smartphone</h2><p>Customers can use the channel they understand. The transaction remains the same across web, USSD, SMS, voice and approved-agent support.</p><div className="access-list"><div><DeviceMobile size={23}/><span><b>Web and smartphone</b><small>Create, pay, upload evidence and track every step visually.</small></span></div><div><Phone size={23}/><span><b>USSD and SMS</b><small>Use numbered menus and simple messages without internet access.</small></span></div><div><ChatCircleText size={23}/><span><b>Voice and trained agents</b><small>Hear transaction terms in a preferred language or receive guided help.</small></span></div></div><AppButton variant="secondary" icon={Phone} onClick={()=>openAuth("signup")}>Try basic-phone access</AppButton></div><div className="access-demo"><header><span><Phone size={20} weight="fill"/> PROOFPAY USSD</span><b>*719#</b></header><div><small>Protected payment PP4582</small><h3>GHS 300.00</h3><p>Seller: Ama Store</p><ol><li>Accept and release</li><li>Report a problem</li><li>Hear transaction details</li><li>Speak to an agent</li></ol><em>Reply with a menu number</em></div><footer><LockKey size={18}/><span>Your confirmation code is not your MoMo PIN.</span></footer></div></section>

      <section className="public-section security-section" id="security"><div className="security-badge"><ShieldCheck size={62} weight="fill"/></div><div><span className="eyebrow">TRUST AND SECURITY</span><h2>Proof before money moves</h2><p>Every protected transaction keeps the agreed terms, verified participants, payment confirmations, delivery evidence and release decision together in one permanent record.</p><div className="security-points"><span><IdentificationCard size={22}/><b>Verified participants</b></span><span><LockKey size={22}/><b>PIN stays private</b></span><span><Bank size={22}/><b>Safeguarded funds</b></span><span><Flag size={22}/><b>Disputes freeze release</b></span></div></div><aside><small>PROOFPAY SAFETY PROMISE</small><b>We will never ask for your MoMo PIN, bank password or payment OTP.</b><p>Enter wallet credentials only inside the official prompt from your payment provider.</p></aside></section>

      <section className="public-section business-section" id="business"><div><span className="eyebrow">PROOFPAY FOR BUSINESS</span><h2>Add protected payments without building the protection system yourself</h2><p>Marketplaces, logistics companies, freelance platforms and merchants can integrate ProofPay's transaction agreement, conditional release, refund, dispute and reconciliation capabilities through APIs.</p><div className="business-tags"><span>Protected-payment API</span><span>Transaction webhooks</span><span>Merchant dashboard</span><span>Fraud monitoring</span></div><AppButton icon={PaperPlaneTilt} onClick={()=>openAuth("signup")}>Request business access</AppButton></div><aside><span><ShieldCheck size={27} weight="fill"/></span><h3>Platform + infrastructure</h3><p>Individuals can use ProofPay directly. Enterprises can add the same protection layer to their own checkout and order flows.</p><div><small>DIRECT USERS</small><b>Web · USSD · SMS · Voice · Agent</b></div><div><small>ENTERPRISES</small><b>API · Webhooks · White label</b></div></aside></section>

      <section className="public-final-cta"><img src="/assets/proofpay-icon.png" alt="ProofPay icon"/><span><small>PAY SAFE. PAY SMART.</small><h2>Make the next payment a protected payment.</h2><p>Use the wallet you already have. Agree clearly. Pay safely. Release fairly.</p></span><div><AppButton icon={ShieldCheck} onClick={()=>openAuth("signup")}>Create free account</AppButton><button onClick={()=>openAuth("login")}>Already registered? Log in</button></div></section>
    </main>
    <footer className="public-footer"><div><img src="/assets/proofpay-horizontal.png" alt="ProofPay"/><p>A simple and inclusive protected-payment platform for local and global trade.</p></div><div><b>Product</b><button onClick={()=>scrollTo("how-it-works")}>How it works</button><button onClick={()=>scrollTo("basic-phone")}>Basic-phone access</button><button onClick={()=>scrollTo("security")}>Security</button></div><div><b>For business</b><button onClick={()=>scrollTo("business")}>API integration</button><button onClick={()=>scrollTo("business")}>Merchant tools</button><button onClick={()=>scrollTo("business")}>Partner with us</button></div><div><b>Support</b><button onClick={()=>openAuth("login")}>Help center</button><button onClick={()=>openAuth("login")}>Report fraud</button><button onClick={()=>openAuth("login")}>Contact ProofPay</button></div><small>© 2026 ProofPay. Pitch prototype. Payment services are provided through licensed partners.</small></footer>
    <AnimatePresence>{authMode&&<LandingAuthModal mode={authMode} onClose={()=>setAuthMode(null)} onEnter={onEnter}/>}</AnimatePresence>
  </div>
}

export function App(){
  const initialPortal=window.location.pathname.startsWith("/admin")?"admin":"public";
  const [portal,setPortal]=useState(initialPortal),[view,setView]=useState("home"),[modal,setModal]=useState(null),[stage,setStage]=useState("protected"),[toast,setToast]=useState(""),[selectedPayment,setSelectedPayment]=useState(null),[user,setUser]=useState(null);
  useEffect(()=>{if(initialPortal!=="admin")restoreAccount().then(session=>{if(session?.user){setUser(session.user);setPortal("customer")}}).catch(()=>{})},[]);
  const goPortal=next=>{window.history.pushState({},"",next==="admin"?"/admin":"/");setPortal(next);window.scrollTo(0,0)};
  const notify=message=>{setToast(message);window.setTimeout(()=>setToast(""),3600)};
  const reset=()=>{setStage("protected");setView("home");setModal(null);setSelectedPayment(null);notify("Pitch demo reset to the protected-payment stage.")};
  const openModal=name=>name==="create"?setView("create"):name==="transactions"?setView("transactions"):setModal(name),closeModal=()=>{setModal(null);setSelectedPayment(null)};
  const openPaymentRecord=payment=>{setSelectedPayment(payment);setModal("payment-detail")};
  if(portal==="admin")return <AdminApp onExit={()=>goPortal("public")}/>;
  if(portal==="public")return <LandingPage onEnter={account=>{setUser(account);setPortal("customer");setView("home")}} onAdmin={()=>goPortal("admin")}/>;
  const logout=async()=>{await logoutAccount();setUser(null);goPortal("public");setModal(null);setView("home")};
  return <div className="app-shell"><Sidebar view={view} setView={setView} openModal={openModal} onLogout={logout}/><main className="main-area"><Header user={user} onReset={reset} openModal={openModal} onLogout={logout}/><AnimatePresence mode="wait"><motion.div key={view} className="page-content" initial={{opacity:0,y:8}} animate={{opacity:1,y:0}} exit={{opacity:0,y:-8}}>{view==="home"&&<HomeView stage={stage} openModal={openModal}/>} {view==="transactions"&&<TransactionsView stage={stage} openModal={openModal} onSelect={openPaymentRecord}/>} {view==="disputes"&&<DisputesView stage={stage} openModal={openModal}/>} {view==="messages"&&<MessagesView notify={notify}/>} {view==="agents"&&<AgentsView notify={notify}/>} {view==="settings"&&<SettingsView notify={notify}/>} {view==="help"&&<HelpSupportView openModal={openModal} notify={notify} onGoAgents={()=>setView("agents")}/>} {view==="create"&&<CreatePaymentModal embedded onClose={()=>setView("home")} onTrack={()=>setView("transactions")} onCreated={()=>{setStage("protected");notify("Protected transaction created successfully.")}}/>}</motion.div></AnimatePresence></main><AnimatePresence>{modal==="track"&&<TrackModal stage={stage} setStage={setStage} onClose={closeModal} notify={notify}/>} {modal==="payment-detail"&&<PaymentDetailModal payment={selectedPayment} onClose={closeModal}/>} {modal==="dispute"&&<DisputeModal onClose={closeModal} onSubmit={()=>{setStage("disputed");notify("Problem reported. The GHS 300.00 payment is on hold.")}}/>}{modal==="ussd"&&<UssdModal onClose={closeModal} setStage={setStage} notify={notify}/>} {(modal==="language"||modal==="help")&&<SimpleInfoModal type={modal} onClose={closeModal}/>}</AnimatePresence><AnimatePresence>{toast&&<Toast message={toast}/>}</AnimatePresence></div>
}
