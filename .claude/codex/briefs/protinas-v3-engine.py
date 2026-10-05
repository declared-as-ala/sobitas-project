# Final Protinas engine model, integer millimes. m, e from config; K courier, S safety.
PPD=20; EARN=1; FEE=10_000; FREE_FROM=300_000
TIERS=[(200_000,3),(350_000,5),(500_000,7)]
def tier(P):
    p=0
    for f,pc in TIERS:
        if P>=f: p=pc
    return p
def price(P, pack=False, coupon=None, gift=0, earned=0, want_earned=0, m=15, K=10_000, S=3_000, min_cash=0):
    # coupon: ('pct',v) ('fixed',v_millimes) ('ship',) ; allow_over via ('pct',v,True)
    F = FEE if P < FREE_FROM else 0
    packAmt = round(P*tier(P)/100) if pack else 0
    ship_coupon = coupon and coupon[0]=='ship'
    Feff = 0 if ship_coupon else F
    A = ((m*PPD-100*EARN)*P)//(100*PPD) + Feff - K - S
    Dmax = (A*PPD)//(PPD-EARN) if A>0 else 0
    pack_c = min(packAmt, Dmax)
    D=pack_c; kind='pack' if pack_c else None; capped=pack_c<packAmt
    if coupon and not ship_coupon:
        allow = len(coupon)>2 and coupon[2]
        c = round(P*coupon[1]/100) if coupon[0]=='pct' else min(coupon[1],P)
        c_c = c if allow else min(c,Dmax)
        if c_c > pack_c: D=c_c; kind='coupon'; capped = c_c<c
    if ship_coupon and A - -(-(pack_c*(PPD-EARN))//PPD) < 0:
        return None  # free-ship code refused on this basket
    room = max(0, A - (-(-D*(PPD-EARN)//PPD)))
    gmax = min(gift, room*PPD//1000)
    due = P - D + Feff
    gpts = min(gmax, -(-due*PPD//1000))
    gval = min(gpts*1000//PPD, due)
    rem = max(0, due - gval - min_cash)
    epts = min(earned, want_earned, -(-rem*PPD//1000))
    eval_ = min(epts*1000//PPD, rem)
    val = gval+eval_
    on_ship=min(Feff,val); on_goods=val-on_ship
    base = max(0, P - D - on_goods)
    earn = (base//1000)*EARN
    total = due - val
    return dict(P=P,F=Feff,A=A,Dmax=Dmax,pack=pack_c,D=D,kind=kind,capped=capped,room=room,gpts=gpts,gval=gval,epts=epts,eval=eval_,on_ship=on_ship,total=total,base=base,earn=earn)
def result(r, mreal, K=10_000):
    # cash profit and net (dV) in millimes
    cost = (100-mreal)*r['P']//100 + K
    cash = r['total'] - cost
    earn_liab = r['earn']*1000//PPD
    dv = cash + r['eval'] - earn_liab
    return cash, dv
