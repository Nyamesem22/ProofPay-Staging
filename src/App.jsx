import { useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import {
  ArrowLeft, ArrowRight, ArrowCounterClockwise, Bank, Bell, CreditCard,
  ChatCircleText, Check, CheckCircle, CircleNotch, Clock, Copy,
  DeviceMobile, DownloadSimple, FileText, Flag, Globe, Headset, House,
  IdentificationCard, ImageSquare, Info, ListChecks, LockKey, MagnifyingGlass, Microphone, Package, PaperPlaneTilt, Phone,
  PencilSimple, Plus, Question, Receipt, SealCheck, Shield, ShieldCheck, SignOut, SpinnerGap, GearSix,
  StopCircle, Storefront, Truck, UploadSimple, User, UsersThree, Wallet, WarningCircle, X,
} from "@phosphor-icons/react";
import "@fontsource-variable/inter";
import { AdminApp } from "./AdminApp";
import { createProtectedTransaction, listProtectedTransactions, loginAccount, logoutAccount, registerAccount, restoreAccount } from "./lib/proofpay-api";
import { bankOptions, detectMobileProvider, maskPhone, mobileProviderOptions, paymentCountries } from "./lib/payment-parties";

const navItems = [
  { id: "home", label: "Home", icon: House },
  { id: "transactions", label: "Activity", icon: Receipt },
  { id: "messages", label: "Messages", icon: ChatCircleText },
  { id: "settings", label: "Settings", icon: GearSix },
];

const historyTransactions = [
  { ref: "PP-260822-9X7L", item: "Blender", buyer: "Kojo Mensah", seller: "Ama Store", amount: 300, fee: 4.50, date: "22 Aug 2026", dateKey: "2026-08-22", status: "Protected", channel: "MTN MoMo" },
  { ref: "PP-260819-7F2M", item: "Website design milestone", buyer: "Kojo Mensah", seller: "PixelCraft Studio", amount: 450, fee: 6.75, date: "19 Aug 2026", dateKey: "2026-08-19", status: "Released", channel: "Bank account" },
  { ref: "PP-260818-4A1P", item: "Wireless Headset", buyer: "Kojo Mensah", seller: "Tech Junction", amount: 150, fee: 2.25, date: "18 Aug 2026", dateKey: "2026-08-18", status: "Released", channel: "Telecel Cash" },
  { ref: "PP-260812-3K8N", item: "Canvas Sneakers", buyer: "Kojo Mensah", seller: "Urban Kicks", amount: 250, fee: 3.75, date: "12 Aug 2026", dateKey: "2026-08-12", status: "Refunded", channel: "MTN MoMo" },
  { ref: "PP-260805-6B4Q", item: "Farm supplies", buyer: "Kojo Mensah", seller: "Green Field Co-op", amount: 620, fee: 9.30, date: "05 Aug 2026", dateKey: "2026-08-05", status: "Released", channel: "AT Money" },
  { ref: "PP-260728-2D5R", item: "Catering deposit", buyer: "Kojo Mensah", seller: "Akwaaba Kitchen", amount: 180, fee: 0, date: "28 Jul 2026", dateKey: "2026-07-28", status: "Cancelled", channel: "MTN MoMo" },
];

function customerTransaction(row){
  const rawStatus=row.status||"PROTECTED";
  const labels={READY_TO_RELEASE:"Ready to release",RELEASED:"Released",REFUNDED:"Refunded",DISPUTED:"On hold",CANCELLED:"Cancelled",PROTECTED:"Protected"};
  return {ref:row.reference||row.ref||`PP-${String(row.id||"DEMO").slice(0,8).toUpperCase()}`,item:row.item_description||row.itemDescription||row.item||"Protected payment",buyer:row.buyer_name||row.buyer||"You",seller:row.receiver_name||row.receiverName||row.counterpartyName||row.seller||"Receiver",amount:Number(row.amount_minor!=null?row.amount_minor/100:row.amount||0),fee:Number(row.fee_minor!=null?row.fee_minor/100:row.fee||0),date:new Date(row.created_at||row.createdAt||Date.now()).toLocaleDateString("en-GH",{day:"2-digit",month:"short",year:"numeric"}),status:labels[rawStatus]||rawStatus.toLowerCase().replaceAll("_"," ").replace(/^./,letter=>letter.toUpperCase()),channel:row.receiver_provider||row.receiverProvider||row.counterpartyProvider||row.channel||"Mobile money"};
}
let syncedActivityRows=historyTransactions;
const initialNotifications = [
  {id:"seller-delivery",category:"Messages",source:"Ama Store",sourceType:"Seller",title:"Your blender is ready for delivery",summary:"Ama Store has confirmed that the item is ready and asked you to keep the delivery code private.",body:["Ama Store says your blender is ready for delivery this afternoon.","Inspect the item before you approve release. If anything is wrong, report it during the 24-hour inspection period so the GHS 300.00 stays protected."],time:"2 min",date:"24 Aug 2026 · 11:58 PM",unread:true,tone:"seller",icon:Storefront,action:"track",actionLabel:"View protected payment",transaction:{ref:"PP-260822-9X7L",amount:"GHS 300.00",status:"Protected",party:"Ama Store"}},
  {id:"payment-protected",category:"Transactions",source:"ProofPay",sourceType:"Transaction update",title:"GHS 300.00 is still protected",summary:"The payment will not be released until you confirm delivery or the agreed inspection period ends.",body:["Your payment for the blender remains safeguarded with a licensed payment partner.","Ama Store cannot receive the money early. You can inspect the item, approve release, or report a problem from the transaction page."],time:"18 min",date:"24 Aug 2026 · 11:42 PM",unread:true,tone:"transaction",icon:ShieldCheck,action:"track",actionLabel:"Track transaction",transaction:{ref:"PP-260822-9X7L",amount:"GHS 300.00",status:"Protected",party:"Ama Store"}},
  {id:"support-reply",category:"Messages",source:"ProofPay Support",sourceType:"Support",title:"We received the evidence you sent",summary:"A support specialist has added your document to the protected transaction record.",body:["Your evidence was received successfully and is now attached to the permanent transaction record.","You do not need to send it again. ProofPay Support will notify both parties if more information is required."],time:"1 hr",date:"24 Aug 2026 · 10:55 PM",unread:true,tone:"support",icon:ChatCircleText,action:"messages",actionLabel:"Open support message"},
  {id:"service-maintenance",category:"Updates",source:"ProofPay",sourceType:"Upcoming announcement",title:"Short service maintenance tonight",summary:"Payment tracking may refresh more slowly from 1:00 AM to 1:20 AM. Protected money is not affected.",body:["ProofPay will complete a short service update on 25 August between 1:00 AM and 1:20 AM.","You can still use *719# and view saved transaction details. New status updates may take a few extra minutes to appear. Protected funds and agreed release rules will remain unchanged."],time:"3 hrs",date:"24 Aug 2026 · 8:40 PM",unread:false,tone:"announcement",icon:Info,action:"help",actionLabel:"Get help"},
  {id:"ussd-announcement",category:"Updates",source:"ProofPay",sourceType:"Service announcement",title:"Use ProofPay without mobile data",summary:"Dial *719# to track, release or report a protected payment from any supported phone.",body:["ProofPay services are now available through the *719# demo flow when mobile data is unavailable.","Use your ProofPay transaction code for confirmation. Never enter your MoMo PIN into a ProofPay screen, message or agent conversation."],time:"Yesterday",date:"23 Aug 2026 · 4:20 PM",unread:false,tone:"announcement",icon:Phone,action:"ussd",actionLabel:"Open *719#"},
];

function stageNotification(stage){
  const states={
    delivered:{title:"Delivery evidence was submitted",summary:"Ama Store marked the blender as delivered. Your 24-hour inspection period has started.",body:["Ama Store submitted delivery evidence for the blender.","Review the item before the inspection period ends. Approve the delivery only when everything matches the agreement, or report a problem to keep the payment on hold."],status:"Delivered · inspection open",icon:Package},
    released:{title:"GHS 300.00 was released",summary:"Your approval was recorded and the licensed payment partner paid Ama Store.",body:["The protected payment was released successfully to Ama Store.","ProofPay recorded your approval, the release rule and the partner payout confirmation in the transaction receipt."],status:"Released",icon:CheckCircle},
    disputed:{title:"Release paused — payment on hold",summary:"Your problem report was received. GHS 300.00 will remain protected during review.",body:["ProofPay paused the release after your problem report.","Both parties can submit evidence. Support will notify you when there is a response or a decision."],status:"On hold",icon:Flag},
  };
  const item=states[stage];
  return item?{id:`stage-${stage}`,category:"Transactions",source:"ProofPay",sourceType:"Transaction update",title:item.title,summary:item.summary,body:item.body,time:"Now",date:"24 Aug 2026 · Now",unread:true,tone:stage==="disputed"?"alert":"transaction",icon:item.icon,action:"track",actionLabel:"View transaction",transaction:{ref:"PP-260822-9X7L",amount:"GHS 300.00",status:item.status,party:"Ama Store"}}:null;
}

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

function Sidebar({ view, setView, onLogout }) {
  return <aside className="sidebar">
    <div className="brand-lockup"><img src="/assets/proofpay-horizontal-dark.png" alt="ProofPay - Pay Safe. Pay Smart." /></div>
    <nav className="side-nav" aria-label="Main navigation">{navItems.map(({ id, label, icon: Icon }) => <motion.button key={id} aria-label={label} title={label} className={`nav-item ${id === view ? "nav-item--active" : ""}`} onClick={() => setView(id)} whileHover={{ x: 3 }} whileTap={{ scale: 0.98 }}><Icon size={24} /><span>{label}</span></motion.button>)}</nav>
    <div className="sidebar-spacer" />
    <div className="sidebar-utility"><button aria-label="Sign out" title="Sign out" onClick={onLogout}><SignOut size={24}/><span>Sign out</span></button></div>
  </aside>;
}

function Header({ openModal, onOpenSettings, onOpenNotifications, unreadCount }) {
  return <header className="topbar mobile-app-bar">
    <img className="app-bar-brand-mark" src="/assets/proofpay-app-mark-transparent.png" alt="ProofPay"/>
    <span className="app-bar-actions"><button className="app-bar-icon notification-trigger" aria-label={`Open notifications, ${unreadCount} unread`} onClick={onOpenNotifications}><Bell size={24}/>{unreadCount>0&&<span className="notification-count" aria-hidden="true">{unreadCount>9?"9+":unreadCount}</span>}</button><button className="app-bar-icon" aria-label="Open help" onClick={()=>openModal("help")}><Question size={24}/></button><button className="app-bar-icon" aria-label="Open account settings" onClick={onOpenSettings}><User size={25}/></button></span>
  </header>;
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

function HomeView({stage,openModal}){
  const status=stage==="released"?"Released":stage==="disputed"?"On hold":"Protected";
  const campaigns=[
    {image:"/assets/proofpay-campaign-pay-safe.png",alt:"Pay safe. Win smart. Protected payments, every time.",action:"create"},
    {image:"/assets/proofpay-campaign-track.png",alt:"Track it. Trust it. Follow every protected payment.",action:"track"},
    {image:"/assets/proofpay-campaign-ussd.png",alt:"No data? No problem. Dial *719# to use ProofPay.",action:"ussd"},
    {image:"/assets/proofpay-campaign-report.png",alt:"Something wrong? Report it. Your payment stays protected.",action:"dispute"},
    {image:"/assets/proofpay-campaign-support.png",alt:"Help is always close. Message support or find a verified agent.",action:"messages"},
  ];
  const [campaign,setCampaign]=useState(0);
  useEffect(()=>{const timer=window.setInterval(()=>setCampaign(current=>(current+1)%campaigns.length),4200);return()=>window.clearInterval(timer)},[campaigns.length]);
  return <motion.section className="simple-home" initial={{opacity:0,y:8}} animate={{opacity:1,y:0}}>
    <section className="momo-wallet-card">
      <button className="momo-wallet-balance" onClick={()=>openModal("track")}><span><small>Protected balance</small><strong>GHS 300.00</strong><em><ShieldCheck size={15} weight="fill"/> {status}</em></span><ArrowRight size={21}/></button>
    </section>
    <div className="momo-service-grid">
      <button onClick={()=>openModal("create")}><span className="action-icon action-icon--blue"><Plus size={25} weight="bold"/></span><b>Pay</b></button>
      <button onClick={()=>openModal("track")}><span className="action-icon action-icon--green"><MagnifyingGlass size={25} weight="bold"/></span><b>Track</b></button>
      <button onClick={()=>openModal("dispute")}><span className="action-icon action-icon--amber"><Flag size={25} weight="fill"/></span><b>Report</b></button>
      <button onClick={()=>openModal("ussd")}><span className="action-icon action-icon--navy"><Phone size={25} weight="fill"/></span><b>Use *719#</b></button>
    </div>
    <section className="proofpay-campaigns"><button className="campaign-banner" onClick={()=>openModal(campaigns[campaign].action)} aria-label={campaigns[campaign].alt}><AnimatePresence mode="wait"><motion.img key={campaigns[campaign].image} src={campaigns[campaign].image} alt={campaigns[campaign].alt} initial={{opacity:0,x:18}} animate={{opacity:1,x:0}} exit={{opacity:0,x:-18}} transition={{duration:.35}}/></AnimatePresence></button><div className="campaign-dots" aria-label="ProofPay service promotions">{campaigns.map((item,index)=><button key={item.image} className={index===campaign?"is-active":""} aria-label={`Show service promotion ${index+1}`} onClick={()=>setCampaign(index)}/>)}</div></section>
  </motion.section>
}

function NotificationsView({notifications,onRead,onReadAll,onNavigate,openModal,notify}){
  const [filter,setFilter]=useState("All"),[selectedId,setSelectedId]=useState(null);
  const selected=notifications.find(item=>item.id===selectedId);
  const SelectedIcon=selected?.icon;
  const unreadCount=notifications.filter(item=>item.unread).length;
  const visible=filter==="All"?notifications:notifications.filter(item=>item.category===filter);
  const openNotification=item=>{onRead(item.id);setSelectedId(item.id);window.scrollTo(0,0)};
  const followAction=item=>{
    if(item.action==="messages")onNavigate("messages");
    else if(item.action==="activity")onNavigate("transactions");
    else openModal(item.action);
  };
  return <motion.section className="content-page notifications-page" initial={{opacity:0,y:10}} animate={{opacity:1,y:0}}>
    <AnimatePresence mode="wait">{selected?<motion.div key="detail" className="notification-detail" initial={{opacity:0,x:24}} animate={{opacity:1,x:0}} exit={{opacity:0,x:18}}>
      <header className="notification-detail-header"><button aria-label="Back to notifications" onClick={()=>setSelectedId(null)}><ArrowLeft size={21}/></button><span><small>NOTIFICATION</small><h2>{selected.title}</h2></span></header>
      <section className={`notification-detail-source notification-tone--${selected.tone}`}><span className="notification-source-icon"><SelectedIcon size={26} weight="fill"/></span><span><b>{selected.source}</b><small>{selected.sourceType} · {selected.date}</small></span></section>
      <div className="notification-detail-copy">{selected.body.map(line=><p key={line}>{line}</p>)}</div>
      {selected.transaction&&<section className="notification-transaction"><header><Receipt size={19} weight="fill"/><b>Transaction</b></header><div><span><small>Reference</small><b>{selected.transaction.ref}</b></span><span><small>Amount</small><b>{selected.transaction.amount}</b></span><span><small>Other party</small><b>{selected.transaction.party}</b></span><span><small>Status</small><b>{selected.transaction.status}</b></span></div></section>}
      <div className="notification-safety"><LockKey size={18}/><span><b>Your security stays the same</b><small>ProofPay notifications never ask for your MoMo PIN, password or payment OTP.</small></span></div>
      <AppButton className="notification-primary-action" icon={ArrowRight} onClick={()=>followAction(selected)}>{selected.actionLabel}</AppButton>
    </motion.div>:<motion.div key="list" className="notification-inbox" initial={{opacity:0,x:-18}} animate={{opacity:1,x:0}} exit={{opacity:0,x:-18}}>
      <div className="notification-page-title"><span><h2>Notifications</h2><small>{unreadCount?`${unreadCount} unread`:"You're all caught up"}</small></span><button disabled={!unreadCount} onClick={()=>{onReadAll();notify("All notifications marked as read.")}}><CheckCircle size={18} weight="fill"/> Mark all read</button></div>
      <nav className="notification-filters" aria-label="Notification categories">{["All","Transactions","Messages","Updates"].map(item=><button key={item} className={filter===item?"is-active":""} onClick={()=>setFilter(item)}>{item}</button>)}</nav>
      <div className="notification-list">{visible.map(item=>{const Icon=item.icon;return <button key={item.id} className={`notification-row notification-tone--${item.tone} ${item.unread?"is-unread":""}`} onClick={()=>openNotification(item)}><span className="notification-source-icon"><Icon size={23} weight="fill"/></span><span className="notification-row-copy"><span><b>{item.source}</b><small>{item.time}</small></span><strong>{item.title}</strong><p>{item.summary}</p><em>{item.sourceType}</em></span>{item.unread&&<i aria-label="Unread notification"/>}<ArrowRight size={17}/></button>})}</div>
    </motion.div>}</AnimatePresence>
  </motion.section>;
}

function TransactionsView({stage,openModal,onSelect,activityRows=syncedActivityRows}){
  const [query,setQuery]=useState(""),[statusFilter,setStatusFilter]=useState("All"),[page,setPage]=useState(1);
  const pageSize=5;
  const rows=useMemo(()=>activityRows.map((item,index)=>index===0?{...item,status:stage==="released"?"Released":stage==="disputed"?"On hold":stage==="delivered"?"Ready to release":item.status}:item),[stage,activityRows]);
  const filtered=useMemo(()=>rows.filter(item=>{
    const text=`${item.item} ${item.seller} ${item.buyer} ${item.ref}`.toLowerCase();
    const matchesQuery=text.includes(query.trim().toLowerCase());
    const matchesStatus=statusFilter==="All"||item.status===statusFilter;
    return matchesQuery&&matchesStatus;
  }),[rows,query,statusFilter]);
  const totalPages=Math.max(1,Math.ceil(filtered.length/pageSize));
  const visible=filtered.slice((page-1)*pageSize,page*pageSize);
  useEffect(()=>setPage(1),[query,statusFilter]);
  useEffect(()=>setPage(current=>Math.min(current,totalPages)),[totalPages]);
  const money=value=>`GHS ${value.toFixed(2)}`;
  const totals={protected:rows.filter(r=>["Protected","Ready to release","On hold"].includes(r.status)).reduce((sum,r)=>sum+r.amount,0),released:rows.filter(r=>r.status==="Released").reduce((sum,r)=>sum+r.amount,0),refunded:rows.filter(r=>r.status==="Refunded").reduce((sum,r)=>sum+r.amount,0),count:rows.length};
  const exportStatement=()=>{const header="Reference,Item,Seller,Amount,Fee,Status,Date\n";const body=filtered.map(r=>`${r.ref},${r.item},${r.seller},${r.amount.toFixed(2)},${r.fee.toFixed(2)},${r.status},${r.date}`).join("\n");const url=URL.createObjectURL(new Blob([header+body],{type:"text/csv"}));const link=document.createElement("a");link.href=url;link.download="ProofPay-payment-history.csv";link.click();URL.revokeObjectURL(url)};
  return <motion.section className="content-page simple-activity-page" initial={{opacity:0,y:10}} animate={{opacity:1,y:0}}>
    <div className="activity-frozen-panel">
      <div className="simple-page-title simple-page-title--action-only"><AppButton icon={Plus} onClick={()=>openModal("create")}>Pay</AppButton></div>
      <div className="activity-money-summary"><div><small>Protected</small><b>{money(totals.protected)}</b></div><div><small>Released</small><b>{money(totals.released)}</b></div><div><small>Refunded</small><b>{money(totals.refunded)}</b></div></div>
      <div className="simple-activity-toolbar"><label><MagnifyingGlass size={19}/><input value={query} onChange={e=>setQuery(e.target.value)} placeholder="Search payments" aria-label="Search payments"/></label><select value={statusFilter} onChange={e=>setStatusFilter(e.target.value)} aria-label="Filter by status"><option>All</option><option>Protected</option><option>Released</option><option>Refunded</option><option>Cancelled</option></select><button aria-label="Download activity" onClick={exportStatement}><DownloadSimple size={20}/></button></div>
    </div>
    <div className="simple-payment-list">{visible.map(item=>{const ActivityIcon=["Protected","Ready to release"].includes(item.status)?ShieldCheck:item.status==="Released"?CheckCircle:item.status==="Refunded"?ArrowCounterClockwise:item.status==="On hold"?Flag:X;return <button key={item.ref} aria-label={`Open ${item.item} payment record`} onClick={()=>onSelect(item)}><span className={`history-product-mark history-product-mark--${item.status.toLowerCase().replaceAll(" ","-")}`}><ActivityIcon size={24} weight="fill"/></span><span><b>{item.item}</b><small>{item.seller} · {item.date}</small></span><span><b>{money(item.amount)}</b><small>{item.status}</small></span></button>})}{!visible.length&&<div className="activity-empty" role="status"><MagnifyingGlass size={25}/><b>No activity found</b><small>Try a different search or status.</small></div>}</div>
    <nav className="activity-pagination" aria-label="Activity pages"><button disabled={page===1} onClick={()=>setPage(current=>Math.max(1,current-1))}>Previous</button><span><b>Page {page}</b><small>of {totalPages}</small></span><button disabled={page===totalPages} onClick={()=>setPage(current=>Math.min(totalPages,current+1))}>Next</button></nav>
  </motion.section>
}

function DisputesView({stage,openModal}){return <motion.section className="content-page" initial={{opacity:0,y:10}} animate={{opacity:1,y:0}}><div className="page-title"><div><span className="eyebrow">RESOLUTION</span><h2>Disputes and support</h2><p>Open a case, add evidence and follow a fair resolution process.</p></div><AppButton icon={Flag} onClick={()=>openModal("dispute")}>Report a problem</AppButton></div><div className="empty-feature"><div className="empty-feature__icon"><Shield size={48}/></div><h3>{stage==="disputed"?"Your case is being reviewed":"No open disputes"}</h3><p>{stage==="disputed"?"Case DP-2208-04 is protecting GHS 300.00 while our team reviews the evidence.":"If a product or service does not match the agreement, report it before the inspection period ends."}</p><AppButton variant="secondary" icon={stage==="disputed"?ChatCircleText:Info} onClick={()=>openModal("help")}>{stage==="disputed"?"View case messages":"Learn how disputes work"}</AppButton></div><div className="resolution-steps">{[{icon:Flag,t:"Report the issue",p:"Choose the transaction and explain what happened."},{icon:UploadSimple,t:"Add evidence",p:"Attach delivery photos, messages or supporting files."},{icon:UsersThree,t:"Fair review",p:"Both parties can respond before a decision is made."}].map(({icon:Icon,t,p},i)=><div key={t}><span>{i+1}</span><Icon size={28}/><b>{t}</b><p>{p}</p></div>)}</div></motion.section>}

const customerConversations=[
  {id:"ama",name:"Ama Store",role:"Seller · PP-260822-9X7L",preview:"Your blender is ready for delivery.",time:"10:42 AM",unread:2,initials:"AS",tone:"green"},
  {id:"support",name:"ProofPay Support",role:"Case support",preview:"We received the evidence you sent.",time:"Yesterday",unread:0,initials:"PP",tone:"blue"},
  {id:"agent",name:"Adom Verified Agent",role:"Agent · Madina",preview:"I can help you with the USSD steps.",time:"21 Aug",unread:0,initials:"AV",tone:"navy"},
];
const initialConversationMessages={
  ama:[{id:"ama-1",sender:"participant",author:"Ama Store",text:"Hello Kojo. Your blender is ready for delivery this afternoon.",time:"10:30 AM"},{id:"ama-2",sender:"customer",author:"You",text:"Thank you. Please use the delivery code in the agreement.",time:"10:34 AM",status:"Read"},{id:"ama-3",sender:"participant",author:"Ama Store",text:"Yes, I will. The payment still shows as protected on my side.",time:"10:42 AM"}],
  support:[{id:"support-1",sender:"support",author:"ProofPay Support",text:"Hello Kojo. ProofPay Support is here to help with your protected transaction.",time:"Yesterday"},{id:"support-2",sender:"customer",author:"You",text:"I sent the delivery evidence for the blender. Please confirm that it was received.",time:"Yesterday",status:"Read"},{id:"support-3",sender:"support",author:"ProofPay Support",text:"We received it. Your evidence is attached to the protected payment record.",time:"Yesterday"}],
  agent:[{id:"agent-1",sender:"participant",author:"Adom Verified Agent",text:"I can guide you through *719# without touching your phone or asking for your PIN.",time:"21 Aug"}],
};
const agentLocations=[
  {name:"Adom MoMo Services",area:"Madina Market, Accra",hours:"Open · closes 7:00 PM",services:"Registration · payment · transaction help",distance:"0.8 km",initials:"AM"},
  {name:"Grace Bank & Mobile Money",area:"Legon Main Road, Accra",hours:"Open · closes 8:00 PM",services:"USSD support · verification · dispute help",distance:"1.6 km",initials:"GB"},
  {name:"Nii's Verified Pay Point",area:"Atomic Junction, Accra",hours:"Open · closes 6:30 PM",services:"Payment requests · status checks · language help",distance:"2.4 km",initials:"NP"},
  {name:"Rural Trust Agent",area:"Abokobi Township",hours:"Open · closes 6:00 PM",services:"Voice support · registration · seller onboarding",distance:"4.1 km",initials:"RT"},
];

function MessagesView({notify,messages,onSend}){
  const [selectedId,setSelectedId]=useState(null),[draft,setDraft]=useState(""),[unread,setUnread]=useState({ama:2,support:0,agent:0}),[attachment,setAttachment]=useState(null),[recording,setRecording]=useState(false);
  const threadRef=useRef(null),fileInputRef=useRef(null),recorderRef=useRef(null),recordingChunksRef=useRef([]);
  const selected=customerConversations.find(item=>item.id===selectedId);
  const selectedMessages=selectedId?messages[selectedId]||[]:[];
  useEffect(()=>{threadRef.current?.scrollTo({top:threadRef.current.scrollHeight,behavior:"smooth"})},[selectedId,selectedMessages.length]);
  const openConversation=id=>{setSelectedId(id);setUnread(current=>({...current,[id]:0}));setDraft("");setAttachment(null);window.scrollTo(0,0)};
  const chooseAttachment=event=>{const file=event.target.files?.[0];event.target.value="";if(!file)return;if(file.size>20*1024*1024){notify("Choose a file smaller than 20 MB.");return}setAttachment({name:file.name,type:file.type||"application/octet-stream",size:file.size,url:URL.createObjectURL(file)})};
  const toggleRecording=async()=>{if(recording){recorderRef.current?.stop();return}try{const stream=await navigator.mediaDevices.getUserMedia({audio:true});const recorder=new MediaRecorder(stream);recordingChunksRef.current=[];recorder.ondataavailable=event=>event.data.size&&recordingChunksRef.current.push(event.data);recorder.onstop=()=>{const blob=new Blob(recordingChunksRef.current,{type:recorder.mimeType||"audio/webm"});stream.getTracks().forEach(track=>track.stop());setRecording(false);onSend(selected.id,{text:"",attachment:{name:"Voice message",type:blob.type,size:blob.size,url:URL.createObjectURL(blob)},kind:"voice"});notify(selected.id==="support"?"Voice message delivered to ProofPay Support.":"Voice message sent.")};recorderRef.current=recorder;recorder.start();setRecording(true)}catch{notify("Microphone access is needed to record a voice message.")}};
  const send=event=>{event?.preventDefault();if(!selected||(!draft.trim()&&!attachment))return;onSend(selected.id,{text:draft.trim(),attachment});setDraft("");setAttachment(null);notify(selected.id==="support"?"Message delivered to ProofPay Support.":"Private message sent.")};
  if(selected)return <motion.section className="content-page customer-page messages-page customer-chat-screen" initial={{opacity:0,x:18}} animate={{opacity:1,x:0}}>
    <header className="customer-chat-header"><button aria-label="Back to conversations" onClick={()=>setSelectedId(null)}><ArrowLeft size={22}/></button><span className={`conversation-avatar conversation-avatar--${selected.tone}`}>{selected.initials}</span><span><b>{selected.name}</b><small>{selected.role}</small></span><em><LockKey size={14}/> Private</em></header>
    <div className="customer-chat-thread" ref={threadRef} aria-live="polite">{selectedMessages.map(message=><article className={message.sender==="customer"?"is-mine":""} key={message.id}><small>{message.sender==="customer"?"You":message.author}</small>{message.text&&<p>{message.text}</p>}{message.attachment&&<MessageAttachment attachment={message.attachment}/>}<footer><span>{message.time}</span>{message.sender==="customer"&&<em><CheckCircle size={13} weight="fill"/> {message.status||"Delivered"}</em>}</footer></article>)}</div>
    <form className="customer-chat-composer" onSubmit={send}>{attachment&&<div className="pending-attachment"><FileText size={18} weight="fill"/><span><b>{attachment.name}</b><small>{formatFileSize(attachment.size)}</small></span><button type="button" aria-label="Remove attachment" onClick={()=>setAttachment(null)}><X size={16}/></button></div>}<input ref={fileInputRef} type="file" hidden accept="image/*,video/*,audio/*,.pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt" onChange={chooseAttachment}/><button type="button" aria-label="Attach image, video, PDF or document" onClick={()=>fileInputRef.current?.click()}><UploadSimple size={21}/></button><button type="button" className={recording?"is-recording":""} aria-label={recording?"Stop voice recording":"Record voice message"} onClick={toggleRecording}>{recording?<StopCircle size={23} weight="fill"/>:<Microphone size={22} weight="fill"/>}</button><label><input value={draft} onChange={event=>setDraft(event.target.value)} placeholder={recording?"Recording voice…":`Message ${selected.name}`} aria-label={`Message ${selected.name}`}/></label><button type="submit" aria-label="Send message" disabled={!draft.trim()&&!attachment}><PaperPlaneTilt size={22} weight="fill"/></button></form>
  </motion.section>;
  return <motion.section className="content-page customer-page messages-page messages-inbox" initial={{opacity:0,y:10}} animate={{opacity:1,y:0}}>
    <div className="customer-conversation-list">{customerConversations.map(item=>{const thread=messages[item.id]||[],last=thread[thread.length-1];return <button key={item.id} onClick={()=>openConversation(item.id)}><span className={`conversation-avatar conversation-avatar--${item.tone}`}>{item.initials}</span><span><b>{item.name}{item.id!=="ama"&&<SealCheck size={14} weight="fill"/>}</b><small>{item.role}</small><em>{last?.text||last?.attachment?.name||item.preview}</em></span><span><small>{last?.time||item.time}</small>{unread[item.id]>0&&<i>{unread[item.id]}</i>}</span></button>})}</div>
  </motion.section>;
}

const formatFileSize=size=>size<1024?`${size} B`:size<1024*1024?`${(size/1024).toFixed(1)} KB`:`${(size/1024/1024).toFixed(1)} MB`;
function MessageAttachment({attachment}){const type=attachment.type||"";if(type.startsWith("image/"))return <img className="chat-media chat-media--image" src={attachment.url} alt={attachment.name}/>;if(type.startsWith("video/"))return <video className="chat-media" src={attachment.url} controls aria-label={attachment.name}/>;if(type.startsWith("audio/"))return <div className="chat-audio"><Microphone size={20} weight="fill"/><audio src={attachment.url} controls aria-label={attachment.name}/></div>;return <a className="chat-file" href={attachment.url} download={attachment.name}><FileText size={24} weight="fill"/><span><b>{attachment.name}</b><small>{formatFileSize(attachment.size)}</small></span></a>}

function AgentsView({notify}){
  const [query,setQuery]=useState(""),[selected,setSelected]=useState(null);const visible=agentLocations.filter(a=>`${a.name} ${a.area} ${a.services}`.toLowerCase().includes(query.toLowerCase()));
  return <motion.section className="content-page customer-page agents-page" initial={{opacity:0,y:10}} animate={{opacity:1,y:0}}><div className="page-title"><div><span className="eyebrow">ASSISTED ACCESS</span><h2>Verified ProofPay agents</h2><p>Find trained support near you. An agent can guide you, but only you can confirm payment, release or refund.</p></div><AppButton icon={Phone} onClick={()=>notify("USSD access opened: dial *719# on your phone.")}>Use USSD instead</AppButton></div><div className="agent-safety"><ShieldCheck size={29} weight="fill"/><div><b>A ProofPay agent will never ask for your MoMo PIN.</b><span>Keep your phone in your hand and personally approve every wallet prompt.</span></div><button>Agent safety rules <ArrowRight size={15}/></button></div><div className="agent-toolbar"><label><MagnifyingGlass size={19}/><input value={query} onChange={e=>setQuery(e.target.value)} placeholder="Search by area, town or service"/></label><select><option>Within 5 km</option><option>Within 10 km</option><option>All locations</option></select><select><option>Open now</option><option>All hours</option></select></div><div className="agents-layout"><section className="agent-results"><header><b>{visible.length} verified agents near Accra</b><span>Location updates are simulated for this pitch prototype.</span></header>{visible.map(agent=><button key={agent.name} className={selected?.name===agent.name?"is-active":""} onClick={()=>setSelected(agent)}><span className="agent-logo">{agent.initials}</span><span><b>{agent.name}<SealCheck size={15} weight="fill"/></b><small>{agent.area}</small><em>{agent.services}</em></span><span><b>{agent.distance}</b><small className="green-text">{agent.hours}</small><ArrowRight size={16}/></span></button>)}</section><aside className="agent-detail">{selected?<><span className="agent-logo agent-logo--large">{selected.initials}</span><SealCheck size={23} weight="fill"/><h3>{selected.name}</h3><p>{selected.area}</p><dl><div><dt>Status</dt><dd className="green-text">{selected.hours}</dd></div><div><dt>Distance</dt><dd>{selected.distance}</dd></div><div><dt>Services</dt><dd>{selected.services}</dd></div><div><dt>Languages</dt><dd>English · Twi · Ga</dd></div></dl><AppButton icon={Phone} onClick={()=>notify(`Calling request prepared for ${selected.name}.`)}>Call agent</AppButton><AppButton variant="secondary" icon={ChatCircleText} onClick={()=>notify(`Secure message opened with ${selected.name}.`)}>Send message</AppButton></>:<><UsersThree size={43}/><h3>Select an agent</h3><p>Choose a verified location to view its services, opening hours and support options.</p></>}</aside></div></motion.section>
}

function SettingsView({notify}){
  const [selected,setSelected]=useState(null),[editing,setEditing]=useState(false);const tabs=["Profile","Security","Payment methods","Notifications"];
  const save=()=>notify("Settings saved successfully.");
  const tabCopy={Profile:["Kojo Mensah",User],Security:["All secure",ShieldCheck],"Payment methods":["1 connected",Wallet],Notifications:["4 active",Bell]};
  return <motion.section className="content-page customer-page settings-page simple-settings momo-settings" initial={{opacity:0,y:10}} animate={{opacity:1,y:0}}>
    <div className="settings-frozen-panel">
      <section className="settings-account-card"><span className="settings-account-avatar">KM</span><span><small>PROOFPAY ACCOUNT</small><b>Kojo Mensah</b><em>055 123 4567</em></span><span><SealCheck size={17} weight="fill"/> Verified</span></section>
    </div>
    <nav className="settings-tile-grid" aria-label="Settings categories">{tabs.map(item=>{const Icon=tabCopy[item][1];return <button key={item} aria-haspopup="dialog" aria-expanded={selected===item} onClick={()=>{setSelected(item);setEditing(false)}}><span className={`setting-nav-icon setting-nav-icon--${item.toLowerCase().replace(" ","-")}`}><Icon size={25}/></span><b>{item}</b><small>{tabCopy[item][0]}</small></button>})}</nav>
    <AnimatePresence>{selected&&<ModalShell title={selected} onClose={()=>{setSelected(null);setEditing(false)}} className="modal--settings"><div className="settings-modal-content">
      {selected==="Profile"&&<div className="settings-action-list"><button onClick={()=>setEditing(!editing)}><span className="setting-row-icon"><User size={21}/></span><span><b>Name</b><small>Kojo Mensah</small></span><PencilSimple size={18}/></button>{editing&&<div className="settings-quick-edit"><label>Preferred name<input defaultValue="Kojo" autoFocus/></label><AppButton icon={Check} onClick={()=>{setEditing(false);save()}}>Done</AppButton></div>}<button onClick={()=>notify("Your verified mobile number cannot be changed in the demo.")}><span className="setting-row-icon"><Phone size={21}/></span><span><b>Mobile</b><small>055 *** 4567</small></span><SealCheck size={18} weight="fill"/></button><button onClick={()=>notify("Language picker opened.")}><span className="setting-row-icon"><Globe size={21}/></span><span><b>Language</b><small>English</small></span><ArrowRight size={18}/></button></div>}
      {selected==="Security"&&<SettingsSecurity notify={notify}/>}
      {selected==="Payment methods"&&<PaymentMethods notify={notify}/>}
      {selected==="Notifications"&&<SettingsToggles items={["Payments","Delivery reminders","Messages","Security alerts"]}/>}
    </div></ModalShell>}</AnimatePresence>
  </motion.section>
}
function SettingsSecurity({notify}){const rows=[[ShieldCheck,"Phone verification","Active"],[IdentificationCard,"Identity","Verified"],[LockKey,"ProofPay code","Change"],[DeviceMobile,"Trusted devices","1 device"]];return <div className="settings-action-list">{rows.map(([Icon,label,status])=><button key={label} onClick={()=>notify(`${label} opened.`)}><span className="setting-row-icon"><Icon size={21}/></span><span><b>{label}</b><small>{status}</small></span><ArrowRight size={18}/></button>)}<div className="compact-pin-note"><LockKey size={18}/><b>Never share your wallet PIN.</b></div></div>}
function PaymentMethods({notify}){return <div className="settings-action-list payment-action-list"><button onClick={()=>notify("MTN MoMo settings opened.")}><span className="method-logo method-logo--momo">MoMo</span><span><b>MTN MoMo</b><small>055 *** 4567</small></span><SealCheck size={18} weight="fill"/></button><button onClick={()=>notify("Bank connection opened.")}><span className="setting-row-icon"><Bank size={21}/></span><span><b>Bank account</b><small>Connect</small></span><Plus size={18}/></button><button onClick={()=>notify("Card connection opened.")}><span className="setting-row-icon"><Wallet size={21}/></span><span><b>Card</b><small>Connect</small></span><Plus size={18}/></button></div>}
function SettingsToggles({items}){return <div className="toggle-list compact-toggle-list">{items.map(item=><label key={item}><span><b>{item}</b></span><input type="checkbox" defaultChecked/><i/></label>)}</div>}

function HelpSupportView({openModal,notify,onGoAgents}){
  const [openFaq,setOpenFaq]=useState(0),[message,setMessage]=useState("");const faqs=["How does ProofPay protect my money?","When will a seller receive the money?","What happens when I report a problem?","Can an agent approve a payment for me?","Does ProofPay need my MoMo PIN?"];
  return <motion.section className="content-page customer-page help-page" initial={{opacity:0,y:10}} animate={{opacity:1,y:0}}><div className="help-hero"><div><span className="eyebrow">HELP & SUPPORT</span><h2>How can we help you today?</h2><p>Find a simple answer, speak to support or get help through USSD and a verified agent.</p><label><MagnifyingGlass size={20}/><input placeholder="Search payments, disputes, agents or security"/></label></div><Headset size={72} weight="fill"/></div><div className="help-options"><button onClick={()=>notify("Live support chat opened.")}><ChatCircleText size={27}/><span><b>Chat with support</b><small>Average reply under 3 minutes</small></span><ArrowRight size={17}/></button><button onClick={()=>notify("Call request created for 0302 000 777.")}><Phone size={27}/><span><b>Call ProofPay</b><small>Available 24 hours every day</small></span><ArrowRight size={17}/></button><button onClick={()=>openModal("ussd")}><DeviceMobile size={27}/><span><b>Use USSD</b><small>Dial *719# without internet</small></span><ArrowRight size={17}/></button><button onClick={onGoAgents}><UsersThree size={27}/><span><b>Visit an agent</b><small>Get guided help near you</small></span><ArrowRight size={17}/></button></div><div className="help-grid"><section className="faq-panel"><span className="eyebrow">COMMON QUESTIONS</span><h3>Quick answers</h3>{faqs.map((faq,index)=><article key={faq}><button onClick={()=>setOpenFaq(openFaq===index?-1:index)}><b>{faq}</b><Plus size={18}/></button>{openFaq===index&&<p>{index===0?"A licensed payment partner safeguards the money. ProofPay records the agreement and sends a release or refund instruction only when the agreed conditions are satisfied.":index===1?"A fully green transaction is released automatically. ProofPay targets a decision in under five seconds and wallet credit normally within one minute.":index===2?"The payment is frozen, both parties can submit evidence and a trained reviewer records a fair release, refund or split decision.":index===3?"No. An agent can explain the steps, but the customer must personally confirm payment, release and refund actions.":"No. Enter your PIN only inside the official prompt from MTN MoMo, Telecel Cash, AT Money or your bank."}</p>}</article>)}</section><section className="support-form"><span className="eyebrow">SEND A SUPPORT REQUEST</span><h3>Tell us what you need</h3><label>Topic<select><option>Payment or release</option><option>Dispute</option><option>Account verification</option><option>Agent concern</option><option>Security or fraud</option></select></label><label>Transaction ID, if available<input placeholder="Example: PP-260822-9X7L"/></label><label>Your message<textarea value={message} onChange={e=>setMessage(e.target.value)} rows="5" placeholder="Explain what happened in your own words."/></label><AppButton icon={PaperPlaneTilt} disabled={!message.trim()} onClick={()=>{notify("Support request submitted. Reference SUP-260824-18.");setMessage("")}}>Send to support</AppButton><small><LockKey size={14}/> Do not include your MoMo PIN, bank password or payment OTP.</small></section></div></motion.section>
}

function ModalShell({title,subtitle,onClose,children,wide=false,className="",embedded=false}){
  const content=<motion.section className={`${embedded?"embedded-flow":"modal"} ${wide&&!embedded?"modal--wide":""} ${className}`} initial={{opacity:0,y:embedded?10:26,scale:embedded?1:.975}} animate={{opacity:1,y:0,scale:1}} exit={{opacity:0,y:embedded?-8:18,scale:embedded?1:.98}} transition={spring} onMouseDown={e=>e.stopPropagation()}><header className={embedded?"embedded-flow__header":"modal-header"}><div>{title&&<h2>{title}</h2>}{subtitle&&<p>{subtitle}</p>}</div><motion.button whileTap={{scale:.9}} onClick={onClose} aria-label={embedded?"Return to dashboard":"Close modal"}>{embedded?<ArrowLeft size={22}/>:<X size={23}/>}</motion.button></header>{children}</motion.section>;
  return embedded?content:<motion.div className="modal-backdrop" initial={{opacity:0}} animate={{opacity:1}} exit={{opacity:0}} onMouseDown={onClose}>{content}</motion.div>;
}

const wizardSteps=["Parties","Agreement","Release rule"];
function CreatePaymentModal({onClose,onCreated,onTrack,embedded=false,user}){
  const [step,setStep]=useState(0),[processing,setProcessing]=useState(false),[complete,setComplete]=useState(false);
  const [verifying,setVerifying]=useState(false),[partyVerified,setPartyVerified]=useState(false);
  const [partyConfirmed,setPartyConfirmed]=useState(false),[inviteSuccess,setInviteSuccess]=useState(false);
  const [releaseStatement,setReleaseStatement]=useState(""),[releaseEvidence,setReleaseEvidence]=useState(null),[releaseChecked,setReleaseChecked]=useState(false);
  const [walletPrompt,setWalletPrompt]=useState(false),[receiptCopied,setReceiptCopied]=useState(false);
  const [persistenceNote,setPersistenceNote]=useState("");
  const currentUserName=user?.fullName||"Kojo Mensah",currentUserPhone=user?.phone||"0551234567",currentUserProvider=user?.provider||"MTN MoMo";
  const todayDate=new Date().toISOString().slice(0,10),defaultDeliveryDate=new Date(Date.now()+86400000).toISOString().slice(0,10);
  const [form,setForm]=useState({role:"buyer",accountType:"business",seller:"024 987 6543",sellerName:"Ama Owusu",businessName:"Ama Store",contactName:"Ama Owusu",country:"GH",provider:"MTN MoMo",destinationType:"wallet",bankName:"GCB Bank Plc",bankAccount:"",bankAccountName:"",fundingMethod:"wallet",fundingProvider:currentUserProvider,fundingPhone:currentUserPhone,cardName:currentUserName,cardNumber:"",cardExpiry:"",cardCvc:"",partyStatus:"new",inviteChannel:"SMS",item:"Blender",amount:"300.00",agreementType:"Goods delivery",agreementStatement:"One working blender, including the jug and power cable, delivered in the agreed condition.",autoConfirmAgreement:true,date:defaultDeliveryDate,time:"12:00",evidence:"Delivery photo and buyer confirmation",inspection:"24 hours",rule:"Buyer confirms delivery"});
  const update=(k,v)=>setForm(x=>({...x,[k]:v}));
  const deliveryDueAt=`${form.date}T${form.time || "00:00"}:00`;
  const deliveryDateLabel=form.date ? new Intl.DateTimeFormat("en-GB",{day:"numeric",month:"long",year:"numeric"}).format(new Date(`${form.date}T00:00:00`)) : "Not set";
  const agreementReady=form.item.trim().length>=3&&Number(form.amount)>0&&Boolean(form.date)&&Boolean(form.time)&&form.agreementStatement.trim().length>=10;
  const releaseVerificationReady=releaseStatement.trim().length>=10&&Boolean(releaseEvidence)&&releaseChecked;
  const counterpartyName=form.accountType==="business"?form.businessName:form.sellerName;
  const currentRoleLabel=form.role==="buyer"?"Buyer / sender":"Seller / receiver";
  const counterpartyContactReady=form.seller.replace(/\D/g,"").length>=9;
  const destinationReady=form.destinationType==="wallet"?(form.role==="buyer"?counterpartyContactReady&&Boolean(form.provider):form.fundingPhone.replace(/\D/g,"").length>=9&&Boolean(form.fundingProvider)):form.bankAccount.replace(/\D/g,"").length>=6&&Boolean(form.bankName)&&Boolean(form.bankAccountName.trim());
  const fundingReady=form.role==="seller"||form.fundingMethod==="wallet"?form.fundingPhone.replace(/\D/g,"").length>=9:form.cardNumber.replace(/\D/g,"").length>=12&&form.cardExpiry.trim().length>=4&&form.cardCvc.trim().length>=3;
  const counterpartyReady=Boolean(counterpartyName.trim())&&counterpartyContactReady&&destinationReady&&fundingReady&&Boolean(form.inviteChannel||form.partyStatus==="existing");
  const counterpartyDestination=form.role==="seller"?`Invitation contact · ${maskPhone(form.seller)}`:form.destinationType==="wallet"?`${form.provider} · ${maskPhone(form.seller)}`:`${form.bankName} · •••• ${form.bankAccount.replace(/\D/g,"").slice(-4)||"----"}`;
  const resetPartyVerification=()=>{setPartyVerified(false);setInviteSuccess(false);setPartyConfirmed(false)};
  const openWalletPrompt=()=>setWalletPrompt(true);
  const approveWallet=async()=>{
    setProcessing(true);
    try{
      const result=await createProtectedTransaction({
        counterpartyPhone:form.seller,
        counterpartyName,
        counterpartyProvider:form.destinationType==="wallet"?form.provider:form.bankName,
        item:form.item,
        amount:Number(form.amount),
        currency:"GHS",
        deliveryDate:deliveryDueAt,
        evidenceRequired:form.evidence,
        inspectionPeriod:form.inspection,
        releaseRule:form.rule,
        agreementType:form.agreementType,
        agreementStatement:form.agreementStatement,
        automaticAgreementConfirmation:form.autoConfirmAgreement,
      });
      setPersistenceNote(result?.mode==="browser-demo"?"Saved securely in this browser for the offline pitch demo.":"Saved to the ProofPay database with an auditable transaction record.");
    }catch(error){
      setPersistenceNote(error.message||"The demo completed, but its server record could not be saved.");
    }finally{
      window.setTimeout(()=>{setProcessing(false);setWalletPrompt(false);setComplete(true);onCreated()},650);
    }
  };
  const copyReference=async()=>{try{await navigator.clipboard.writeText("PP-260822-9X7L");setReceiptCopied(true);window.setTimeout(()=>setReceiptCopied(false),1800)}catch{setReceiptCopied(true)}};
  const downloadReceipt=()=>{const receipt=`PROOFPAY PROTECTED PAYMENT RECEIPT\n\nTransaction: PP-260822-9X7L\nStatus: PROTECTED\nBuyer: ${form.role==="buyer"?currentUserName:counterpartyName}\nSeller: ${form.role==="seller"?currentUserName:counterpartyName}\nItem: ${form.item}\nProtected amount: GHS ${form.amount}\nProtection fee: GHS 4.50\nTotal authorised: GHS 304.50\nRelease rule: ${form.rule}\nInspection period: ${form.inspection}\n\nThe protected amount is held by a licensed payment partner in a safeguarded account.`;const blob=new Blob([receipt],{type:"text/plain"});const url=URL.createObjectURL(blob);const anchor=document.createElement("a");anchor.href=url;anchor.download="ProofPay-PP-260822-9X7L-receipt.txt";anchor.click();URL.revokeObjectURL(url)};
  const updateParty=(k,v)=>{update(k,v);resetPartyVerification()};
  const updatePartyPhone=value=>{const detected=detectMobileProvider(form.country,value);setForm(current=>({...current,seller:value,provider:detected||current.provider}));resetPartyVerification()};
  const updatePartyCountry=country=>{const detected=detectMobileProvider(country,form.seller);const defaults={GH:"MTN MoMo",TG:"Mixx by Yas",CM:"Orange Money",NG:"SmartCash PSB"};setForm(current=>({...current,country,provider:detected||defaults[country]}));resetPartyVerification()};
  const verifyParty=()=>{if(!counterpartyReady||!partyConfirmed)return;setVerifying(true);setInviteSuccess(false);window.setTimeout(()=>{setVerifying(false);setPartyVerified(true);setInviteSuccess(true);window.setTimeout(()=>{setStep(1);document.querySelector(".embedded-flow--wizard .wizard-body")?.scrollTo({top:0,behavior:"smooth"})},900)},700)};
  return <ModalShell title={complete?"Payment protected":""} subtitle={complete?"Your agreement is active and the seller can now deliver.":""} onClose={onClose} wide className={`${embedded?"embedded-flow--wizard":"modal--wizard"} ${!complete?"payment-wizard--compact-header":""}`} embedded={embedded}>
    {!complete&&<div className="wizard-steps">{wizardSteps.map((label,index)=><div className={index===step?"is-active":index<step?"is-complete":""} key={label}><span>{index<step?<Check size={15} weight="bold"/>:index+1}</span><b>{label}</b></div>)}</div>}
    <AnimatePresence mode="wait">{complete?<motion.div className="payment-success-page" key="success" initial={{opacity:0,y:12}} animate={{opacity:1,y:0}}>
      <section className="payment-success-hero">
        <motion.div className="success-shield" initial={{scale:0,rotate:-18}} animate={{scale:1,rotate:0}} transition={{...spring,delay:.08}}><ShieldCheck size={64} weight="fill"/></motion.div>
        <div><span className="success-kicker">PAYMENT SUCCESSFUL · TRANSACTION PROTECTED</span><h3>GHS {form.amount} is now safeguarded</h3><p>Your payment was approved through MTN MoMo. The protected amount is held by a licensed payment partner and will be released only under the agreed rule.</p></div>
        <span className="success-status-pill"><CheckCircle size={18} weight="fill"/> PROTECTED</span>
      </section>
      <div className="success-confirmations"><span><CheckCircle size={18} weight="fill"/><b>Wallet payment confirmed</b><small>GHS 304.50 authorised</small></span><span><Bank size={18} weight="fill"/><b>Funds safeguarded</b><small>GHS {form.amount} protected</small></span><span><Bell size={18} weight="fill"/><b>Seller notified</b><small>{counterpartyName} can now deliver</small></span></div>
      <div className="success-content-grid">
        <section className="success-receipt-card">
          <div className="success-card-heading"><div><Receipt size={22} weight="fill"/><span><small>PROOFPAY RECEIPT</small><h4>PP-260822-9X7L</h4></span></div><button type="button" onClick={copyReference}><Copy size={15}/>{receiptCopied?"Copied":"Copy ID"}</button></div>
          <div className="success-receipt-grid">
            <div><small>BUYER / SENDER</small><b>{form.role==="buyer"?currentUserName:counterpartyName}</b><span>{form.role==="buyer"?`${currentUserProvider} · ${maskPhone(currentUserPhone)}`:counterpartyDestination}</span></div>
            <div><small>SELLER / RECEIVER</small><b>{form.role==="seller"?currentUserName:counterpartyName}</b><span>{form.role==="seller"?`${currentUserProvider} · ${maskPhone(currentUserPhone)}`:counterpartyDestination}</span></div>
            <div><small>ITEM OR SERVICE</small><b>{form.item}</b></div>
            <div><small>DELIVERY DATE</small><b>{deliveryDateLabel} · {form.time}</b></div>
            <div><small>PROTECTED AMOUNT</small><b>GHS {form.amount}</b></div>
            <div><small>PROTECTION FEE</small><b>GHS 4.50</b></div>
            <div className="success-receipt-wide"><small>ACTIVE RELEASE RULE</small><b><ListChecks size={16} weight="fill"/> {form.rule}</b><span>{form.inspection} inspection period · disputes freeze release</span></div>
          </div>
        </section>
        <aside className="success-next-card">
          <span className="eyebrow">WHAT HAPPENS NEXT?</span><h4>The seller can now fulfil the agreement</h4>
          <div className="success-next-list"><div className="is-active"><span>1</span><p><b>Payment protected</b><small>Completed now</small></p><CheckCircle size={17} weight="fill"/></div><div><span>2</span><p><b>{form.role==="seller"?currentUserName:counterpartyName} delivers</b><small>Evidence will be submitted</small></p><Clock size={17}/></div><div><span>3</span><p><b>The buyer inspects the item</b><small>{form.inspection} to respond</small></p><Clock size={17}/></div><div><span>4</span><p><b>Release or report a problem</b><small>The buyer remains in control</small></p><ShieldCheck size={17}/></div></div>
          <div className="success-safeguard"><Bank size={22} weight="fill"/><span><b>Money is not in ProofPay’s business account</b><small>It remains with the licensed payment partner until release or refund.</small></span></div>
        </aside>
      </div>
      {persistenceNote&&<div className="success-persistence-note"><CheckCircle size={18} weight="fill"/><span>{persistenceNote}</span></div>}
      <div className="success-actions"><AppButton variant="secondary" icon={DownloadSimple} onClick={downloadReceipt}>Download receipt</AppButton><AppButton icon={ArrowRight} onClick={onTrack||onClose}>Track protected payment</AppButton></div>
    </motion.div>:<motion.div key={step} className="wizard-body" initial={{opacity:0,x:24}} animate={{opacity:1,x:0}} exit={{opacity:0,x:-20}}>
      {step===0&&<div className="parties-layout parties-layout--expanded">
        <div className="parties-main">
          <section className="party-section role-party-section">
            <div className="role-selector" aria-label="Your role in this payment">
              <button type="button" className={form.role==="buyer"?"is-selected":""} onClick={()=>updateParty("role","buyer")}><User size={24}/><span><b>I am buying or paying</b><small>Buyer / sender</small></span><CheckCircle size={21} weight="fill"/></button>
              <button type="button" className={form.role==="seller"?"is-selected":""} onClick={()=>updateParty("role","seller")}><Storefront size={24}/><span><b>I am selling or receiving</b><small>Seller / receiver</small></span><CheckCircle size={21} weight="fill"/></button>
            </div>
          </section>

          <section className="party-section registered-party-section">
            <div className="section-heading"><div><span>YOUR VERIFIED DETAILS</span><h3>{currentUserName}</h3></div><span className="verified-label"><SealCheck size={15} weight="fill"/> Verified</span></div>
            <div className="current-user-card"><span className="avatar avatar--blue">{currentUserName.split(" ").map(part=>part[0]).slice(0,2).join("").toUpperCase()}</span><div><b>{currentRoleLabel}</b><span>{maskPhone(currentUserPhone)} · {currentUserProvider}</span></div><div className="check-stack"><span><CheckCircle size={13} weight="fill"/> Phone</span><span><CheckCircle size={13} weight="fill"/> Wallet</span><span><CheckCircle size={13} weight="fill"/> Identity</span></div></div>
          </section>

          <section className="party-section counterparty-section">

            <div className="compact-choice-group">
              <span>You are an</span>
              <div className="compact-option-selector" aria-label="Other party account type"><button type="button" className={form.accountType==="individual"?"is-selected":""} onClick={()=>updateParty("accountType","individual")}><User size={18}/> Individual</button><button type="button" className={form.accountType==="business"?"is-selected":""} onClick={()=>updateParty("accountType","business")}><Storefront size={18}/> Business</button></div>
            </div>

            <div className="party-form party-form--identity">
              {form.accountType==="business"?<><label>Business name<input value={form.businessName} onChange={event=>updateParty("businessName",event.target.value)} placeholder="Registered business name" autoComplete="organization"/></label><label>Contact person <small>Optional</small><input value={form.contactName} onChange={event=>updateParty("contactName",event.target.value)} placeholder="Person you know" autoComplete="name"/></label></>:<label className="form-span">Full name<input value={form.sellerName} onChange={event=>updateParty("sellerName",event.target.value)} placeholder="Their full name" autoComplete="name"/></label>}
            </div>

            <div className="compact-choice-group compact-choice-group--destination">
              <span>Receiving wallet</span>
              <div className="compact-option-selector" aria-label="Other party receiving destination"><button type="button" className={form.destinationType==="wallet"?"is-selected":""} onClick={()=>updateParty("destinationType","wallet")}><Wallet size={18}/> Mobile wallet</button><button type="button" className={form.destinationType==="bank"?"is-selected":""} onClick={()=>updateParty("destinationType","bank")}><Bank size={18}/> Bank account</button></div>
            </div>

            {form.destinationType==="wallet"&&form.role==="buyer"?<div className="party-form party-form--wallet-destination">
              <label>Country<select value={form.country} onChange={event=>updatePartyCountry(event.target.value)}>{paymentCountries.map(country=><option key={country.code} value={country.code}>{country.label}</option>)}</select></label>
              <label>Mobile-money provider<select value={form.provider} onChange={event=>updateParty("provider",event.target.value)}>{mobileProviderOptions.map(provider=><option key={provider}>{provider}</option>)}</select></label>
              <label className="form-span">Mobile number<input value={form.seller} onChange={event=>updatePartyPhone(event.target.value)} inputMode="tel" autoComplete="tel" placeholder="Enter their wallet number"/><small>Provider is detected while you type.</small></label>
            </div>:form.destinationType==="wallet"?<div className="saved-payment-method seller-receiving-method"><span><Wallet size={22} weight="fill"/></span><div><small>YOUR SAVED VERIFIED WALLET</small><b>{currentUserProvider} · {maskPhone(currentUserPhone)}</b></div><SealCheck size={20} weight="fill"/></div>:<div className="party-form">
              {form.role==="buyer"&&<label className="form-span">Contact mobile number<input value={form.seller} onChange={event=>updatePartyPhone(event.target.value)} inputMode="tel" autoComplete="tel" placeholder="Used for verification or invitation"/></label>}
              <label>Bank<select value={form.bankName} onChange={event=>updateParty("bankName",event.target.value)}>{bankOptions.map(bank=><option key={bank}>{bank}</option>)}</select></label>
              <label>Account number<input value={form.bankAccount} onChange={event=>updateParty("bankAccount",event.target.value)} inputMode="numeric" autoComplete="off" placeholder="Enter account number"/></label>
              <label className="form-span">Account name<input value={form.bankAccountName} onChange={event=>updateParty("bankAccountName",event.target.value)} placeholder="Name on the bank account" autoComplete="name"/></label>
            </div>}
            {form.role==="seller"&&<label className="seller-contact-field">Buyer mobile number<input value={form.seller} onChange={event=>updatePartyPhone(event.target.value)} inputMode="tel" autoComplete="tel" placeholder="Used for verification or invitation"/><small>The buyer receives the secure agreement and payment link on this number.</small></label>}
          </section>

          {form.role==="buyer"&&<section className="party-section funding-section">
            <div className="funding-method-selector" aria-label="Your payment method"><button type="button" className={form.fundingMethod==="wallet"?"is-selected":""} onClick={()=>updateParty("fundingMethod","wallet")}><Wallet size={22}/><span><b>Mobile wallet</b><small>Use your saved verified wallet</small></span><CheckCircle size={20} weight="fill"/></button><button type="button" className={form.fundingMethod==="card"?"is-selected":""} onClick={()=>updateParty("fundingMethod","card")}><CreditCard size={22}/><span><b>Visa card</b><small>Enter card details securely</small></span><CheckCircle size={20} weight="fill"/></button></div>
            {form.fundingMethod==="wallet"?<div className="saved-payment-method"><span><Wallet size={22} weight="fill"/></span><div><small>SAVED VERIFIED WALLET</small><b>{currentUserProvider} · {maskPhone(currentUserPhone)}</b></div><SealCheck size={20} weight="fill"/></div>:<div className="party-form card-entry-form"><label className="form-span">Name on card<input value={form.cardName} onChange={event=>updateParty("cardName",event.target.value)} autoComplete="cc-name"/></label><label className="form-span">Visa card number<input value={form.cardNumber} onChange={event=>updateParty("cardNumber",event.target.value)} inputMode="numeric" autoComplete="cc-number" placeholder="0000 0000 0000 0000" maxLength="23"/></label><label>Expiry<input value={form.cardExpiry} onChange={event=>updateParty("cardExpiry",event.target.value)} inputMode="numeric" autoComplete="cc-exp" placeholder="MM/YY" maxLength="5"/></label><label>Security code<input value={form.cardCvc} onChange={event=>updateParty("cardCvc",event.target.value)} inputMode="numeric" autoComplete="cc-csc" placeholder="CVV" maxLength="4"/></label><small className="form-span secure-entry-copy"><LockKey size={14}/> Card details are sent directly to the licensed payment provider and are not stored by ProofPay.</small></div>}
          </section>}

          <section className="party-section invitation-section">
            <div className="compact-option-selector party-status-selector" aria-label="Other party ProofPay status"><button type="button" className={form.partyStatus==="new"?"is-selected":""} onClick={()=>updateParty("partyStatus","new")}><PaperPlaneTilt size={18}/> Send an invite</button><button type="button" className={form.partyStatus==="existing"?"is-selected":""} onClick={()=>updateParty("partyStatus","existing")}><SealCheck size={18}/> Already registered</button></div>
            {form.partyStatus==="new"&&<div className="channel-selector" aria-label="Invitation method">{[{name:"SMS",icon:DeviceMobile},{name:"WhatsApp",icon:ChatCircleText},{name:"Voice call",icon:Phone}].map(({name,icon:Icon})=><button type="button" key={name} className={form.inviteChannel===name?"is-selected":""} onClick={()=>updateParty("inviteChannel",name)}><Icon size={17}/>{name}</button>)}</div>}
            <label className={`party-confirmation ${counterpartyReady?"":"is-disabled"}`}><input type="checkbox" disabled={!counterpartyReady} checked={partyConfirmed} onChange={event=>setPartyConfirmed(event.target.checked)}/><span>I confirm these are the correct people and payment destinations.</span></label>
            {inviteSuccess&&<motion.div className="party-invite-success" initial={{opacity:0,y:6}} animate={{opacity:1,y:0}}><CheckCircle size={21} weight="fill"/><span><b>{form.partyStatus==="new"?"Verified and invitation sent":"Verified ProofPay account found"}</b><small>Opening the Agreement step…</small></span></motion.div>}
            <AppButton className={`verify-party-button ${verifying?"is-loading":""}`} icon={verifying?SpinnerGap:partyVerified?CheckCircle:PaperPlaneTilt} disabled={verifying||!counterpartyReady||!partyConfirmed} onClick={verifyParty}>{verifying?"Verifying details…":partyVerified?"Opening agreement…":form.partyStatus==="new"?"Verify and send invite":"Verify party and continue"}</AppButton>
          </section>
        </div>

      </div>}
      {step===1&&<section className="simple-wizard-step">
        <div className="simple-details-form">
          <label>Item or service<input value={form.item} onChange={e=>update("item",e.target.value)} autoComplete="off"/></label>
          <label>Amount (GHS)<input type="number" min="0.01" step="0.01" inputMode="decimal" value={form.amount} onChange={e=>update("amount",e.target.value)}/></label>
          <label className="form-span">Agreement type<select value={form.agreementType} onChange={e=>update("agreementType",e.target.value)}><option>Goods delivery</option><option>Service delivery</option><option>Project milestone</option><option>Custom agreement</option></select></label>
          <label>Delivery date<input type="date" min={todayDate} value={form.date} onChange={e=>update("date",e.target.value)}/></label>
          <label>Delivery time<input type="time" value={form.time} onChange={e=>update("time",e.target.value)}/></label>
          <label className="form-span agreement-statement-field">Agreement statement<textarea rows="3" value={form.agreementStatement} onChange={e=>update("agreementStatement",e.target.value)} placeholder="Describe exactly what the buyer must receive."/></label>
        </div>
      </section>}
      {step===2&&<section className="release-rule-picker">
            <div className="release-options">{[
              {rule:"Buyer confirms delivery",icon:ShieldCheck,title:"Buyer confirms delivery",text:"Release only after Kojo checks the item and actively approves it.",tag:"MANUAL"},
              {rule:"Inspection period expires",icon:Clock,title:"Release after inspection period",text:`Release automatically ${form.inspection} after delivery evidence if no dispute is raised.`,tag:"AUTOMATIC"},
              {rule:"Buyer or expiry",icon:ListChecks,title:"Buyer confirms or time expires",text:`Release when Kojo approves, or after ${form.inspection} if no problem is reported.`,tag:"RECOMMENDED"},
            ].map(({rule,icon:Icon,title,text,tag})=><button key={rule} type="button" className={form.rule===rule?"is-selected":""} onClick={()=>update("rule",rule)}><span className="release-option-icon"><Icon size={26} weight="fill"/></span><span className="release-option-copy"><em>{tag}</em><b>{title}</b><small>{text}</small></span><CheckCircle className="release-option-check" size={23} weight="fill"/></button>)}</div>
            <section className="release-verification-form"><label>Buyer confirmation statement<textarea rows="2" value={releaseStatement} onChange={event=>setReleaseStatement(event.target.value)} placeholder="Type a short confirmation about the received item."/></label><label className="release-evidence-upload"><input type="file" accept="image/png,image/jpeg" onChange={event=>setReleaseEvidence(event.target.files?.[0]||null)}/><ImageSquare size={21} weight="fill"/><span><b>{releaseEvidence?releaseEvidence.name:"Attach received-item image"}</b><small>JPG or PNG evidence</small></span><UploadSimple size={18}/></label><label className="release-verification-check"><input type="checkbox" checked={releaseChecked} onChange={event=>setReleaseChecked(event.target.checked)}/><span>Check to ask ProofPay to verify this evidence and release the payment when it matches the agreement.</span></label></section>
      </section>}
    </motion.div>}</AnimatePresence>
    {!complete&&<footer className="wizard-footer"><AppButton variant="ghost" icon={step?ArrowLeft:X} onClick={()=>step?setStep(step-1):onClose()}>{step?"Back":"Cancel"}</AppButton>{step===0?<AppButton icon={partyVerified?CheckCircle:ArrowRight} disabled>{partyVerified?"Opening agreement…":"Continue to agreement"}</AppButton>:step===1?<AppButton icon={ArrowRight} disabled={!agreementReady} onClick={()=>setStep(2)}>Continue to release rule</AppButton>:<AppButton icon={LockKey} disabled={!releaseVerificationReady} onClick={openWalletPrompt}>Authorise GHS 304.50 in wallet</AppButton>}</footer>}
    <AnimatePresence>{walletPrompt&&<motion.div className="wallet-authorisation-overlay" initial={{opacity:0}} animate={{opacity:1}} exit={{opacity:0}}>
      <motion.section className="wallet-authorisation-dialog" initial={{opacity:0,y:18,scale:.97}} animate={{opacity:1,y:0,scale:1}} exit={{opacity:0,y:12,scale:.98}} transition={spring} role="dialog" aria-modal="true" aria-label="MTN MoMo secure authorisation">
        <header><div><span className="wallet-provider-mark"><Wallet size={24} weight="fill"/></span><span><small>PAYMENT PROVIDER</small><b>MTN MoMo secure authorisation</b></span></div><button type="button" aria-label="Close wallet authorisation" onClick={()=>!processing&&setWalletPrompt(false)}><X size={20}/></button></header>
        <div className="wallet-dialog-body">
          <div className="wallet-amount-card"><span><small>PROOFPAY PROTECTED PAYMENT</small><b>{form.item} from {form.role==="seller"?currentUserName:counterpartyName}</b><em>PP-260822-9X7L</em></span><strong>GHS 304.50</strong></div>
          <div className="wallet-breakdown"><div><span>Protected amount</span><b>GHS {form.amount}</b></div><div><span>ProofPay protection fee</span><b>GHS 4.50</b></div></div>
          <footer><AppButton icon={processing?SpinnerGap:CheckCircle} className={processing?"is-loading":""} disabled={processing} onClick={approveWallet}>{processing?"Approving…":"Approve"}</AppButton></footer>
        </div>
      </motion.section>
    </motion.div>}</AnimatePresence>
  </ModalShell>;
}

function TrackModal({stage,setStage,onClose,notify}){
  const [busy,setBusy]=useState(false),[buyerStatement,setBuyerStatement]=useState(""),[receivedImage,setReceivedImage]=useState(null),[releaseChecked,setReleaseChecked]=useState(false),[sellerRating,setSellerRating]=useState(0),[sellerReview,setSellerReview]=useState(""),[closing,setClosing]=useState(false),[closed,setClosed]=useState(false);
  const verificationReady=buyerStatement.trim().length>=10&&Boolean(receivedImage)&&releaseChecked;
  const advance=()=>{
    if(stage==="delivered"&&!verificationReady)return;
    setBusy(true);
    window.setTimeout(()=>{
      const next=stage==="protected"?"delivered":"released";
      setStage(next);setBusy(false);
      notify(next==="delivered"?"Seller delivery recorded. The buyer can inspect the item.":"ProofPay verified the buyer confirmation and sent GHS 300.00 to Ama Store’s saved MTN MoMo wallet.");
    },1200);
  };
  const closeTransaction=()=>{
    if(!sellerRating)return;
    setClosing(true);
    window.setTimeout(()=>{setClosing(false);setClosed(true);notify("Your seller review was submitted and transaction PP-260822-9X7L is closed.")},900);
  };
  return <ModalShell title="Track transaction" subtitle="PP-260822-9X7L · Blender from Ama Store" onClose={onClose} wide>
    <div className="track-layout"><div className="track-main">
      <div className={`track-hero track-hero--${stage}`}><motion.span animate={busy?{rotate:360}:{rotate:0}} transition={busy?{repeat:Infinity,duration:1,ease:"linear"}:{}}>{busy?<CircleNotch size={40}/>:stage==="released"?<CheckCircle size={40} weight="fill"/>:stage==="delivered"?<Package size={40} weight="fill"/>:<ShieldCheck size={40} weight="fill"/>}</motion.span><div><small>CURRENT STATUS</small><h3>{busy?stage==="delivered"?"Verifying agreement…":"Updating transaction…":stage==="released"?"Payment released":stage==="delivered"?"Delivered — awaiting buyer":"Payment protected"}</h3><p>{stage==="released"?"ProofPay sent the approved payment to Ama Store’s saved wallet.":stage==="delivered"?"Confirm the received item and upload a photo for verification.":"The seller can deliver. Funds remain protected."}</p></div></div>
      <ProgressTracker stage={stage}/>
      <div className="evidence-strip"><div><ImageSquare size={26}/><span><b>Seller delivery evidence</b><small>{stage==="protected"?"Waiting for seller":"1 photo · submitted 1:05 PM"}</small></span></div><span className={stage==="protected"?"muted-pill":"status-pill status-pill--completed"}>{stage==="protected"?"Not submitted":"Received"}</span></div>
      {stage==="delivered"&&<section className="buyer-release-form"><div><small>BUYER CONFIRMATION</small><h3>Confirm the item you received</h3></div><label>Confirmation statement<textarea rows="3" value={buyerStatement} onChange={event=>setBuyerStatement(event.target.value)} placeholder="Describe the item received and confirm it matches the agreement."/></label><label className="buyer-release-upload"><input type="file" accept="image/*" onChange={event=>setReceivedImage(event.target.files?.[0]||null)}/><ImageSquare size={22} weight="fill"/><span><b>{receivedImage?receivedImage.name:"Attach received-item image"}</b><small>JPG or PNG · used to verify this release</small></span><UploadSimple size={19}/></label><label className="buyer-release-check"><input type="checkbox" checked={releaseChecked} onChange={event=>setReleaseChecked(event.target.checked)}/><span>I confirm this item matches the agreement and I want ProofPay to verify and release the payment.</span></label></section>}
      {stage==="released"&&<section className="transaction-close-review">{closed?<div className="transaction-closed-state"><CheckCircle size={31} weight="fill"/><span><b>Transaction closed</b><small>Your review has been saved. The payment receipt remains available in Activity.</small></span></div>:<><div className="transaction-close-heading"><span><small>TRANSACTION SUMMARY</small><h3>Review your completed payment</h3></span><b>GHS 300.00</b></div><div className="transaction-summary-item"><img src="/assets/blender.png" alt="Blender"/><span><b>Blender</b><small>Delivery verified · payment released</small></span></div><div className="transaction-people-summary"><div><small>BUYER</small><b>Kojo Mensah</b><span>055 *** 4567</span></div><div><small>SELLER</small><b>Ama Store</b><span>MTN MoMo · 024 *** 6543</span></div></div><div className="seller-review-form"><div><span><small>SELLER REVIEW</small><h3>How was your experience?</h3></span><div className="seller-rating" aria-label="Rate Ama Store from one to five stars">{[1,2,3,4,5].map(value=><button type="button" key={value} className={value<=sellerRating?"is-selected":""} aria-label={`${value} star${value===1?"":"s"}`} onClick={()=>setSellerRating(value)}>★</button>)}</div></div><label>Optional comment<textarea rows="2" value={sellerReview} onChange={event=>setSellerReview(event.target.value)} placeholder="Share a short review for the seller."/></label></div></>}</section>}
    </div><aside className="track-side"><img src="/assets/blender.png" alt="Blender"/><h3>Blender</h3><p>Ama Store · GHS 300.00</p><div><span>Inspection period</span><b>24 hours</b></div><div><span>Release destination</span><b>MTN MoMo · 024 *** 6543</b></div></aside></div>
    <footer className="wizard-footer"><AppButton variant="ghost" onClick={onClose}>{closed?"Done":"Close"}</AppButton>{stage==="protected"&&<AppButton icon={Truck} disabled={busy} onClick={advance}>{busy?"Recording delivery…":"Pitch demo: record delivery"}</AppButton>}{stage==="delivered"&&<AppButton icon={busy?SpinnerGap:ShieldCheck} className={busy?"is-loading":""} disabled={busy||!verificationReady} onClick={advance}>{busy?"Verifying agreement…":"Verify and release payment"}</AppButton>}{stage==="released"&&!closed&&<AppButton icon={closing?SpinnerGap:CheckCircle} className={closing?"is-loading":""} disabled={closing||!sellerRating} onClick={closeTransaction}>{closing?"Submitting review…":"Submit and close transaction"}</AppButton>}</footer>
  </ModalShell>
}

function PaymentDetailModal({payment,onClose}){
  if(!payment)return null;
  const tone=payment.status.toLowerCase().replaceAll(" ","-");
  const protectedPayment=["Protected","Ready to release","On hold"].includes(payment.status);
  const StatusIcon=payment.status==="Released"?CheckCircle:payment.status==="Refunded"?ArrowCounterClockwise:payment.status==="On hold"?Flag:payment.status==="Cancelled"?X:ShieldCheck;
  const statusMessage=payment.status==="Released"?`GHS ${payment.amount.toFixed(2)} was released to ${payment.seller} after the agreement conditions were completed.`:payment.status==="Refunded"?`GHS ${payment.amount.toFixed(2)} was returned to ${payment.buyer}.`:payment.status==="Cancelled"?"This payment request was cancelled before funds were protected.":payment.status==="On hold"?`GHS ${payment.amount.toFixed(2)} remains protected while ProofPay reviews the reported issue.`:payment.status==="Ready to release"?"Delivery was recorded. The payment remains protected until the buyer confirms the agreement was completed.":`GHS ${payment.amount.toFixed(2)} is protected while ${payment.seller} completes the agreement.`;
  const downloadReceipt=()=>{const text=`ProofPay transaction record\n${payment.ref}\n${payment.item}\nSeller: ${payment.seller}\nBuyer: ${payment.buyer}\nAmount: GHS ${payment.amount.toFixed(2)}\nFee: GHS ${payment.fee.toFixed(2)}\nStatus: ${payment.status}\nDate: ${payment.date}`;const url=URL.createObjectURL(new Blob([text],{type:"text/plain"}));const link=document.createElement("a");link.href=url;link.download=`ProofPay-${payment.ref}.txt`;link.click();URL.revokeObjectURL(url)};
  return <ModalShell title="Payment record" subtitle={`${payment.ref} · ${payment.item}`} onClose={onClose} wide>
    <div className="payment-detail-body">
      <section className={`payment-detail-hero payment-detail-hero--${tone}`}><span><StatusIcon size={34} weight="fill"/></span><div><small>{protectedPayment?"CURRENT STATUS":"FINAL STATUS"}</small><h3>{payment.status}</h3><p>{statusMessage}</p></div><em className={`status-pill status-pill--${tone}`}>{payment.status}</em></section>
      <div className="payment-detail-grid">
        <section className="payment-detail-card"><span className="eyebrow">TRANSACTION DETAILS</span><div><span>Item or service</span><b>{payment.item}</b></div><div><span>Protected amount</span><b>GHS {payment.amount.toFixed(2)}</b></div><div><span>Protection fee</span><b>GHS {payment.fee.toFixed(2)}</b></div><div><span>Payment channel</span><b>{payment.channel}</b></div><div><span>Transaction date</span><b>{payment.date}</b></div></section>
        <section className="payment-detail-card"><span className="eyebrow">PARTIES</span><div><span>Buyer / sender</span><b>{payment.buyer}</b></div><div><span>Seller / receiver</span><b>{payment.seller}</b></div><div><span>Identity checks</span><b className="detail-verified"><SealCheck size={16} weight="fill"/> Both verified</b></div><div><span>Transaction reference</span><b>{payment.ref}</b></div><div><span>Record security</span><b>Permanent and auditable</b></div></section>
        <aside className="payment-detail-note"><Bank size={27} weight="fill"/><span><b>{payment.status==="Released"?"Safeguarded funds were released correctly":payment.status==="Refunded"?"Safeguarded funds were returned correctly":payment.status==="Cancelled"?"No protected funds were collected":"The protected amount remains safeguarded"}</b><small>ProofPay keeps the agreement, payment instructions and provider confirmations together in one record.</small></span></aside>
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
  const initialPortal=window.location.pathname.startsWith("/admin")?"admin":new URLSearchParams(window.location.search).get("demo")==="customer"?"customer":"public";
  const [portal,setPortal]=useState(initialPortal),[view,setView]=useState("home"),[modal,setModal]=useState(null),[stage,setStage]=useState("protected"),[toast,setToast]=useState(""),[selectedPayment,setSelectedPayment]=useState(null),[notifications,setNotifications]=useState(initialNotifications),[conversationMessages,setConversationMessages]=useState(initialConversationMessages),[,setActivityRows]=useState(historyTransactions);
  const [user,setUser]=useState(initialPortal==="customer"?{fullName:"Kojo Mensah",phone:"0551234567",provider:"MTN MoMo"}:null);
  useEffect(()=>{if(initialPortal!=="admin")restoreAccount().then(session=>{if(session?.user){setUser(session.user);setPortal("customer")}}).catch(()=>{})},[]);
  const refreshActivity=()=>listProtectedTransactions().then(data=>{if(data.transactions?.length){syncedActivityRows=data.transactions.map(customerTransaction);setActivityRows(syncedActivityRows)}}).catch(()=>{});
  useEffect(()=>{if(portal==="customer"&&user)refreshActivity()},[portal,user]);
  useEffect(()=>{if(portal==="customer"&&user&&view==="transactions")refreshActivity()},[view]);
  useEffect(()=>{const next=stageNotification(stage);if(next)setNotifications(current=>current.some(item=>item.id===next.id)?current:[next,...current])},[stage]);
  const goPortal=next=>{window.history.pushState({},"",next==="admin"?"/admin":"/");setPortal(next);window.scrollTo(0,0)};
  const notify=message=>{setToast(message);window.setTimeout(()=>setToast(""),3600)};
  const openModal=name=>name==="create"?setView("create"):name==="transactions"?setView("transactions"):name==="messages"?setView("messages"):setModal(name),closeModal=()=>{setModal(null);setSelectedPayment(null)};
  const openPaymentRecord=payment=>{setSelectedPayment(payment);setModal("payment-detail")};
  const unreadCount=notifications.filter(item=>item.unread).length;
  const readNotification=id=>setNotifications(current=>current.map(item=>item.id===id?{...item,unread:false}:item));
  const readAllNotifications=()=>setNotifications(current=>current.map(item=>({...item,unread:false})));
  const sendCustomerMessage=(conversationId,payload)=>setConversationMessages(current=>({...current,[conversationId]:[...(current[conversationId]||[]),{id:`${conversationId}-customer-${Date.now()}`,sender:"customer",author:"You",text:payload.text||"",attachment:payload.attachment||null,kind:payload.kind||"message",time:"Now",status:"Delivered"}]}));
  const sendSupportReply=text=>{setConversationMessages(current=>({...current,support:[...(current.support||[]),{id:`support-reply-${Date.now()}`,sender:"support",author:"ProofPay Support",text,time:"Now"}]}));setNotifications(current=>[{id:`support-message-${Date.now()}`,category:"Messages",source:"ProofPay Support",sourceType:"Support reply",title:"ProofPay Support replied",summary:text,body:[text],time:"Now",date:"25 Aug 2026 · Now",unread:true,tone:"support",icon:ChatCircleText,action:"messages",actionLabel:"Read reply"},...current])};
  if(portal==="admin")return <AdminApp onExit={()=>goPortal("public")} supportMessages={conversationMessages.support} onSupportReply={sendSupportReply}/>;
  if(portal==="public")return <LandingPage onEnter={account=>{setUser(account);setPortal("customer");setView("home")}} onAdmin={()=>goPortal("admin")}/>;
  const logout=async()=>{await logoutAccount();setUser(null);goPortal("public");setModal(null);setView("home")};
  return <div className="app-shell"><Sidebar view={view} setView={setView} openModal={openModal} onLogout={logout}/><main className="main-area"><Header openModal={openModal} onOpenSettings={()=>setView("settings")} onOpenNotifications={()=>{setView("notifications");window.scrollTo(0,0)}} unreadCount={unreadCount}/><AnimatePresence mode="wait"><motion.div key={view} className="page-content" initial={{opacity:0,y:8}} animate={{opacity:1,y:0}} exit={{opacity:0,y:-8}}>{view==="home"&&<HomeView stage={stage} openModal={openModal}/>} {view==="notifications"&&<NotificationsView notifications={notifications} onRead={readNotification} onReadAll={readAllNotifications} onNavigate={setView} openModal={openModal} notify={notify}/>} {view==="transactions"&&<TransactionsView stage={stage} openModal={openModal} onSelect={openPaymentRecord}/>} {view==="disputes"&&<DisputesView stage={stage} openModal={openModal}/>} {view==="messages"&&<MessagesView notify={notify} messages={conversationMessages} onSend={sendCustomerMessage}/>} {view==="agents"&&<AgentsView notify={notify}/>} {view==="settings"&&<SettingsView notify={notify}/>} {view==="help"&&<HelpSupportView openModal={openModal} notify={notify} onGoAgents={()=>setView("agents")}/>} {view==="create"&&<CreatePaymentModal embedded user={user} onClose={()=>setView("home")} onTrack={()=>setView("transactions")} onCreated={()=>{setStage("protected");notify("Protected transaction created successfully.")}}/>}</motion.div></AnimatePresence></main><AnimatePresence>{modal==="track"&&<TrackModal stage={stage} setStage={setStage} onClose={closeModal} notify={notify}/>} {modal==="payment-detail"&&<PaymentDetailModal payment={selectedPayment} onClose={closeModal}/>} {modal==="dispute"&&<DisputeModal onClose={closeModal} onSubmit={()=>{setStage("disputed");notify("Problem reported. The GHS 300.00 payment is on hold.")}}/>}{modal==="ussd"&&<UssdModal onClose={closeModal} setStage={setStage} notify={notify}/>} {(modal==="language"||modal==="help")&&<SimpleInfoModal type={modal} onClose={closeModal}/>}</AnimatePresence><AnimatePresence>{toast&&<Toast message={toast}/>}</AnimatePresence></div>
}
